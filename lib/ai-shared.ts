import 'server-only'
import type { Prospect } from './prospects'
import { CANAL_INFO, TEMPERATURA_INFO, STAGES, daysSince } from './prospects'

export const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export function todayLabel(ref: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(ref)
  return `${ref.toISOString().slice(0, 10)} (${weekday})`
}

function formatDatePtBR(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

// ── Contexto para o Gemini (só fatos do prospect, sem inventar nada) ─────────
export function buildProspectContext(prospect: Prospect): string {
  const lines: string[] = []
  lines.push(`Empresa: ${prospect.empresa}`)
  if (prospect.nicho) lines.push(`Nicho: ${prospect.nicho}`)
  if (prospect.cidade) lines.push(`Cidade: ${prospect.cidade}`)
  if (prospect.tamanho) lines.push(`Tamanho: ${prospect.tamanho}`)

  const stageLabel = STAGES.find(s => s.id === prospect.stage)?.name ?? prospect.stage
  lines.push(`Etapa atual (use exatamente este valor, não infira a partir do texto): ${stageLabel}`)
  const d = daysSince(prospect.stage_since)
  lines.push(`Tempo nesta etapa: ${d} dia${d === 1 ? '' : 's'} (desde ${formatDatePtBR(prospect.stage_since)})`)

  lines.push(`Canal de prospecção: ${CANAL_INFO[prospect.canal]?.label ?? prospect.canal}`)
  if (prospect.temperatura) lines.push(`Temperatura: ${TEMPERATURA_INFO[prospect.temperatura]?.label ?? prospect.temperatura}`)
  if (prospect.fit) lines.push(`Fit com o serviço: ${prospect.fit}`)
  if (prospect.tem_verba) lines.push(`Tem verba: ${prospect.tem_verba}`)
  if (prospect.investe_trafego) lines.push(`Já investe em tráfego: ${prospect.investe_trafego}`)
  if (prospect.dor) lines.push(`Dor relatada: ${prospect.dor}`)

  if (prospect.decisor_nome) lines.push(`Decisor: ${prospect.decisor_nome}${prospect.decisor_cargo ? ` (${prospect.decisor_cargo})` : ''}`)
  if (prospect.proxima_acao) lines.push(`Próxima ação registrada: ${prospect.proxima_acao}`)
  if (prospect.return_date) lines.push(`Retorno agendado para: ${prospect.return_date}`)
  if (prospect.valor_potencial) lines.push(`Valor potencial: R$ ${prospect.valor_potencial}`)
  if (prospect.servico_interesse) lines.push(`Serviço de interesse: ${prospect.servico_interesse}`)
  if (prospect.motivo_perda) lines.push(`Motivo de perda registrado: ${prospect.motivo_perda}`)
  if (prospect.observacoes) {
    lines.push(`Observações (texto livre — termos como "hoje"/"ontem" aqui se referem à data em que foram escritos, NÃO à data de hoje): ${prospect.observacoes}`)
  }

  return lines.join('\n')
}

export function buildHistoryContext(logs: { canal: string; note: string; contacted_at: string }[]): string {
  if (logs.length === 0) return 'Nenhum contato registrado no histórico estruturado (contact_log) até agora.'
  return logs.map(l => `[${formatDatePtBR(l.contacted_at)}] (${l.canal}) ${l.note}`).join('\n')
}

export function buildScriptsToneReference(scripts: { nome: string; body: string }[]): string {
  if (scripts.length === 0) return 'Nenhum script cadastrado ainda.'
  return scripts.map(s => `--- ${s.nome} ---\n${s.body}`).join('\n\n')
}

// ── Chamada ao Gemini (retry único em 503/529 de sobrecarga) ─────────────────
export async function geminiPost(apiKey: string, reqBody: unknown): Promise<Response> {
  const url  = `${GEMINI_URL}?key=${apiKey}`
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) }
  let res = await fetch(url, opts)
  if (res.status === 503 || res.status === 529) {
    await new Promise(r => setTimeout(r, 1500))
    res = await fetch(url, opts)
  }
  return res
}
