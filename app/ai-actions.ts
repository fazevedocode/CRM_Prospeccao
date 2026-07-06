'use server'

import { createClient } from '@/lib/supabase/server'
import {
  buildProspectContext, buildHistoryContext, buildScriptsToneReference, geminiPost, todayLabel,
} from '@/lib/ai-shared'
import type { Prospect } from '@/lib/prospects'

export type AiSummaryResult = {
  resumo: string | null
  sugestao: string | null
  generatedAt: string | null
  error?: string
}

export type AiScriptResult = {
  script: string | null
  error?: string
}

async function loadProspectWithAccess(prospectId: string): Promise<
  { prospect: Prospect; userName: string } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const [profileRes, prospectRes] = await Promise.all([
    supabase.from('profiles').select('full_name, email, roles(nome)').eq('id', user.id).single(),
    supabase.from('prospects').select('*').eq('id', prospectId).single(),
  ])

  if (!prospectRes.data) return { error: 'Prospect não encontrado.' }
  const roleName  = (profileRes.data?.roles as unknown as { nome: string } | null)?.nome ?? ''
  const isManager = ['admin', 'closer'].includes(roleName.toLowerCase())
  const prospect  = prospectRes.data as Prospect

  if (!isManager && prospect.responsavel_id !== user.id) return { error: 'Sem permissão para este prospect.' }

  const userName = profileRes.data?.full_name || profileRes.data?.email || user.email || 'Usuário'
  return { prospect, userName }
}

async function callGeminiJson(
  apiKey: string, prompt: string, schema: object,
): Promise<Record<string, string>> {
  const reqBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  const res = await geminiPost(apiKey, reqBody)
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini respondeu ${res.status}: ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Resposta vazia do Gemini: ' + JSON.stringify(data).slice(0, 300))
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('JSON inválido do Gemini: ' + text.slice(0, 300))
  }
}

// ── Resumo do prospect + sugestão de próxima abordagem ───────────────────────
// force=false (abertura do card): só regenera se ainda não existir cache.
// force=true (botão "Atualizar resumo"): sempre regenera.
export async function getAiProspectSummary(prospectId: string, force = false): Promise<AiSummaryResult> {
  const access = await loadProspectWithAccess(prospectId)
  if ('error' in access) return { resumo: null, sugestao: null, generatedAt: null, error: access.error }
  const { prospect } = access

  if (!force && prospect.ai_resumo && prospect.ai_sugestao) {
    return { resumo: prospect.ai_resumo, sugestao: prospect.ai_sugestao, generatedAt: prospect.ai_generated_at }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { resumo: null, sugestao: null, generatedAt: null, error: 'IA não configurada (falta GEMINI_API_KEY).' }

  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('contact_log')
    .select('canal, note, contacted_at')
    .eq('prospect_id', prospectId)
    .order('contacted_at', { ascending: true })

  const prompt = `Você ajuda um vendedor de uma agência de tráfego pago e marketing a entender rapidamente a situação de um prospect B2B no funil de vendas outbound.

DATA DE HOJE: ${todayLabel()}

DADOS DO PROSPECT (fonte de verdade para etapa, responsável e datas já calculadas):
${buildProspectContext(prospect)}

HISTÓRICO ESTRUTURADO DE CONTATOS (contact_log, mais antigo primeiro):
${buildHistoryContext(logs ?? [])}

Gere:
1. "resumo": 2 a 4 frases descrevendo a empresa, há quanto tempo está nessa etapa, o que já aconteceu (contatos/eventos) e possíveis objeções, com base SOMENTE nos dados acima.
2. "sugestao": 1 a 2 frases com a próxima ação recomendada, coerente com a etapa atual e o tempo parado.

Regras obrigatórias:
- Use SEMPRE a DATA DE HOJE acima como referência para qualquer expressão temporal. Nunca presuma que uma data citada no texto livre é "hoje".
- A etapa é EXATAMENTE a informada acima. Nunca infira ou corrija com base no texto.
- Não invente dados (verba, dor, decisor etc.) que não estejam explicitamente nos dados acima.
- Não cite preços de serviços que não estejam no campo "Valor potencial".
- Responda em português do Brasil, tom direto e consultivo, sem markdown.`

  try {
    const parsed = await callGeminiJson(apiKey, prompt, {
      type: 'OBJECT',
      properties: { resumo: { type: 'STRING' }, sugestao: { type: 'STRING' } },
      required: ['resumo', 'sugestao'],
    })
    if (!parsed.resumo?.trim() || !parsed.sugestao?.trim()) throw new Error('Resposta incompleta do Gemini')

    const generatedAt = new Date().toISOString()
    await supabase.from('prospects').update({
      ai_resumo: parsed.resumo.trim(),
      ai_sugestao: parsed.sugestao.trim(),
      ai_generated_at: generatedAt,
    }).eq('id', prospectId)

    return { resumo: parsed.resumo.trim(), sugestao: parsed.sugestao.trim(), generatedAt }
  } catch (err) {
    return {
      resumo: prospect.ai_resumo, sugestao: prospect.ai_sugestao, generatedAt: prospect.ai_generated_at,
      error: err instanceof Error ? err.message : 'Erro ao gerar resumo com IA.',
    }
  }
}

// ── Script de abordagem personalizado (DM ou call), no tom dos scripts cadastrados ──
export async function generateApproachScript(prospectId: string, canal: 'dm' | 'call'): Promise<AiScriptResult> {
  const access = await loadProspectWithAccess(prospectId)
  if ('error' in access) return { script: null, error: access.error }
  const { prospect } = access

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { script: null, error: 'IA não configurada (falta GEMINI_API_KEY).' }

  const supabase = await createClient()
  const { data: scripts } = await supabase
    .from('scripts')
    .select('nome, body')
    .eq('ativo', true)
    .order('ordem')

  const canalLabel = canal === 'dm' ? 'mensagem direta (DM/WhatsApp)' : 'roteiro de ligação (cold call)'

  const prompt = `Você escreve mensagens de prospecção B2B para uma agência de tráfego pago e marketing, no tom de voz definido pelos scripts abaixo (referência de estilo, NÃO copie literalmente).

SCRIPTS DE REFERÊNCIA (tom da marca):
${buildScriptsToneReference(scripts ?? [])}

DADOS DO PROSPECT (fonte de verdade — use apenas o que está aqui, não invente nada):
${buildProspectContext(prospect)}

Gere um "script" de ${canalLabel}, personalizado para este prospect com base no nicho e na dor relatada.

Regras obrigatórias:
- Não invente dados do prospect (verba, resultados, dores) que não estejam nos DADOS DO PROSPECT acima. Se a dor não estiver registrada, fale de forma genérica sobre o nicho, sem inventar um problema específico.
- Mantenha o tom da marca dos scripts de referência: direto, consultivo, sem ser agressivo.
- Se for DM/WhatsApp: mensagem curta (até 4-5 linhas). Se for call: roteiro com abertura, pergunta de diagnóstico e proposta de próximo passo.
- Responda em português do Brasil, sem markdown, apenas o texto pronto para copiar e enviar.`

  try {
    const parsed = await callGeminiJson(apiKey, prompt, {
      type: 'OBJECT',
      properties: { script: { type: 'STRING' } },
      required: ['script'],
    })
    if (!parsed.script?.trim()) throw new Error('Resposta vazia do Gemini')
    return { script: parsed.script.trim() }
  } catch (err) {
    return { script: null, error: err instanceof Error ? err.message : 'Erro ao gerar script com IA.' }
  }
}
