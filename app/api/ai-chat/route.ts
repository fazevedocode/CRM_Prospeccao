import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GEMINI_URL } from '@/lib/ai-shared'

type HistoryItem = { role: 'user' | 'assistant'; content: string }

function safeDate(val: unknown): string | null {
  if (typeof val !== 'string') return null
  return /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : null
}

// ── Tool declarations ─────────────────────────────────────────────────────
// Estas funções SQL ainda serão criadas no banco (métricas do funil). A
// plumbing já está pronta: quando existirem, o assistente passa a responder
// com números reais; até lá, o erro de "função inexistente" vira uma
// mensagem amigável (ver executeTool).
const TOOL_DECLARATIONS = [
  {
    name: 'funil_pipeline_atual',
    description: 'Retorna o snapshot atual do funil de prospecção — quantos prospects estão em cada etapa agora.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'funil_conversao_periodo',
    description: 'Retorna a taxa de conversão (ganhos vs perdidos) e o valor fechado no período.',
    parameters: {
      type: 'OBJECT',
      properties: {
        p_inicio: { type: 'STRING', description: 'Data de início YYYY-MM-DD' },
        p_fim:    { type: 'STRING', description: 'Data de fim YYYY-MM-DD' },
      },
      required: ['p_inicio', 'p_fim'],
    },
  },
  {
    name: 'funil_perdidos_motivo',
    description: 'Retorna os principais motivos de perda no período, com ranking por frequência.',
    parameters: {
      type: 'OBJECT',
      properties: {
        p_inicio: { type: 'STRING', description: 'Data de início YYYY-MM-DD' },
        p_fim:    { type: 'STRING', description: 'Data de fim YYYY-MM-DD' },
      },
      required: ['p_inicio', 'p_fim'],
    },
  },
  {
    name: 'funil_performance_equipe',
    description: 'Retorna abordagens, reuniões, propostas e fechamentos por responsável no período, comparado às metas cadastradas em metas_sdr.',
    parameters: {
      type: 'OBJECT',
      properties: {
        p_inicio: { type: 'STRING', description: 'Data de início YYYY-MM-DD' },
        p_fim:    { type: 'STRING', description: 'Data de fim YYYY-MM-DD' },
      },
      required: ['p_inicio', 'p_fim'],
    },
  },
]

export async function POST(req: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const userId = user.id

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  const body    = await req.json().catch(() => ({}))
  const message = (body.message ?? '').trim() as string
  const history: HistoryItem[] = Array.isArray(body.history) ? body.history : []
  if (!message) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  // ── 3. Gemini API key ──────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ reply: 'O assistente não está configurado. Contate o administrador.' })
  }

  // ── 4. Perfil / cargo do usuário ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, roles(nome)')
    .eq('id', user.id)
    .single()

  const roleName  = (profile?.roles as unknown as { nome: string } | null)?.nome ?? ''
  const isManager = ['admin', 'closer'].includes(roleName.toLowerCase())
  const userName  = profile?.full_name || user.email || 'Usuário'

  // ── 5. Scripts cadastrados como referência de tom ───────────────────────────
  const { data: scriptsRes } = await supabase
    .from('scripts')
    .select('nome, categoria, canal, body')
    .eq('ativo', true)
    .order('ordem')

  const scriptsTexto = (scriptsRes ?? [])
    .map(s => `[${s.categoria} / ${s.canal}] ${s.nome}:\n${s.body}`)
    .join('\n\n') || 'Nenhum script cadastrado ainda.'

  // ── 6. System prompt ───────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const systemPrompt = `Você é o Assistente do Radar CRM, usado por uma equipe de vendas outbound B2B que vende serviços de tráfego pago e marketing. Ajuda com: qual script usar em cada situação; como escrever uma abordagem; e consulta de métricas do funil de prospecção.

Contexto do usuário:
- Nome: ${userName}
- Cargo: ${roleName || 'não definido'}
- Data de hoje: ${today}
- Acesso a métricas do funil: ${isManager ? 'sim (todos os responsáveis)' : 'sim (apenas os próprios prospects)'}

Regras gerais:
- Responda SOMENTE com base nos SCRIPTS DE REFERÊNCIA abaixo ou nas ferramentas de dados do funil.
- Seja breve, direto e em português (pt-BR), tom consultivo de vendas B2B.
- Use SOMENTE texto simples. NUNCA use markdown: sem asteriscos, sem negrito, sem cabeçalhos, sem listas com hífen.
- Não invente dados de prospects específicos — isso só existe no card de cada prospect, não aqui no chat geral.

Regras para métricas do funil:
- Para perguntas sobre pipeline atual, conversão, motivos de perda ou performance da equipe: use SEMPRE a ferramenta correspondente. Nunca invente números.
- Se a ferramenta retornar erro (métrica ainda não disponível), diga isso claramente em vez de inventar.
- Ao interpretar períodos: "este mês" = 1º dia do mês atual até hoje; "esta semana" = segunda-feira até hoje; "últimos 30 dias" = hoje menos 30 dias até hoje. Use sempre ${today} como referência.

Nomenclatura do Radar CRM (use sempre):
- "prospect" = empresa no funil de prospecção
- etapas do funil: Prospect, Abordagem feita, Em conversa, Reunião/Diagnóstico, Proposta enviada, Negociação, Ganho, Perdido
- "SDR" = quem prospecta e qualifica; "Closer" = quem fecha a venda

SCRIPTS DE REFERÊNCIA (tom da marca):
${scriptsTexto}`

  // ── 7. Conteúdo da conversa ────────────────────────────────────────────────
  const baseContents: object[] = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ]

  // ── 8. Executor de ferramentas (escopo fixado pelo servidor) ────────────────
  async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const validFns = new Set([
      'funil_pipeline_atual', 'funil_conversao_periodo', 'funil_perdidos_motivo', 'funil_performance_equipe',
    ])
    if (!validFns.has(name)) return { error: 'Ferramenta não reconhecida' }

    const params: Record<string, unknown> = { p_responsavel_id: isManager ? null : userId }
    if (name !== 'funil_pipeline_atual') {
      const inicio = safeDate(args.p_inicio)
      const fim    = safeDate(args.p_fim)
      if (!inicio || !fim) return { error: 'Datas inválidas ou não informadas' }
      params.p_inicio = inicio
      params.p_fim = fim
    }

    const { data, error } = await supabase.rpc(name, params)
    if (error) return { error: 'Métrica ainda não disponível no banco.' }
    return data ?? { error: 'sem dados' }
  }

  // ── 9. Chamada ao Gemini com suporte a function calling ─────────────────────
  async function geminiPost(reqBody: unknown): Promise<Response> {
    const url  = `${GEMINI_URL}?key=${apiKey}`
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) }
    let res = await fetch(url, opts)
    if (res.status === 503 || res.status === 529) {
      await new Promise(r => setTimeout(r, 1500))
      res = await fetch(url, opts)
    }
    return res
  }

  function geminiErrMsg(status: number): string {
    if (status === 429) return 'O assistente está temporariamente indisponível (limite de uso atingido). Aguarde alguns minutos e tente novamente.'
    if (status === 503 || status === 529) return 'O assistente está sobrecarregado no momento. Aguarde alguns instantes e tente novamente.'
    return `O assistente encontrou um erro (${status}). Tente novamente em instantes.`
  }

  async function callGemini(contents: object[]): Promise<string> {
    const reqBody: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      tools:      [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
    }

    const res = await geminiPost(reqBody)
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[ai-chat] Gemini turn-1 error', res.status, errText)
      return geminiErrMsg(res.status)
    }

    const geminiData = await res.json()
    const candidate  = geminiData.candidates?.[0]
    if (!candidate) return 'Não obtive resposta do assistente. Tente novamente.'

    const reason = candidate.finishReason as string | undefined
    if (reason && reason !== 'STOP' && reason !== 'MAX_TOKENS' && !candidate.content?.parts?.length) {
      return 'Não consegui responder esta pergunta. Por favor, reformule.'
    }

    const fnCall = candidate.content?.parts?.find(
      (p: Record<string, unknown>) => 'functionCall' in p
    )?.functionCall as { name: string; args: Record<string, unknown> } | undefined

    if (fnCall) {
      const toolResult = await executeTool(fnCall.name, fnCall.args ?? {})

      const contentsWithResult: object[] = [
        ...contents,
        { role: 'model', parts: [{ functionCall: fnCall }] },
        { role: 'user',  parts: [{ functionResponse: { name: fnCall.name, response: { result: toolResult } } }] },
      ]

      const res2 = await geminiPost({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contentsWithResult,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      })

      if (!res2.ok) {
        const errText2 = await res2.text().catch(() => '')
        console.error('[ai-chat] Gemini turn-2 error', res2.status, errText2)
        return geminiErrMsg(res2.status)
      }
      const data2 = await res2.json()
      return data2.candidates?.[0]?.content?.parts?.[0]?.text
        ?? 'Não consegui formatar a resposta. Tente novamente.'
    }

    return candidate.content?.parts?.[0]?.text
      ?? 'Não obtive resposta do assistente. Tente novamente.'
  }

  // ── 10. Executa e retorna ────────────────────────────────────────────────
  try {
    const reply = await callGemini(baseContents)
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[ai-chat] error', err)
    return NextResponse.json({
      reply: 'Erro de conexão com o assistente. Verifique sua internet e tente novamente.',
    })
  }
}
