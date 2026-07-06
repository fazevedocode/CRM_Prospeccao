export type Stage =
  | 'prospect' | 'abordagem' | 'conversa' | 'reuniao'
  | 'proposta' | 'negociacao' | 'ganho' | 'perdido'

export type Canal = 'dm_instagram' | 'cold_call' | 'indicacao' | 'presencial' | 'outro'
export type Temperatura = 'frio' | 'morno' | 'quente'
export type Fit = 'alto' | 'medio' | 'baixo'
export type TemVerba = 'sim' | 'nao' | 'a_confirmar'
export type InvesteTrafego = 'nunca' | 'mal' | 'bem_com_outro'

export type Prospect = {
  id: string
  empresa: string
  nicho: string | null
  instagram: string | null
  site: string | null
  cidade: string | null
  tamanho: string | null
  decisor_nome: string | null
  decisor_cargo: string | null
  telefone: string | null
  decisor_instagram: string | null
  email: string | null
  canal: Canal
  responsavel_id: string | null
  stage: Stage
  stage_since: string
  return_date: string | null
  proxima_acao: string | null
  tentativas: number | null
  temperatura: Temperatura | null
  fit: Fit | null
  tem_verba: TemVerba | null
  investe_trafego: InvesteTrafego | null
  dor: string | null
  valor_potencial: number | null
  servico_interesse: string | null
  observacoes: string | null
  motivo_perda: string | null
  closed_at: string | null
  closed_by_id: string | null
  ai_resumo: string | null
  ai_sugestao: string | null
  ai_generated_at: string | null
  created_at: string
}

export type StageInfo = { id: Stage; name: string; color: string; type?: 'won' | 'lost' }

export const STAGES: StageInfo[] = [
  { id: 'prospect',   name: 'Prospect',              color: '#64748B' },
  { id: 'abordagem',  name: 'Abordagem feita',        color: '#6366F1' },
  { id: 'conversa',   name: 'Em conversa',            color: '#0EA5E9' },
  { id: 'reuniao',    name: 'Reunião/Diagnóstico',    color: '#8B5CF6' },
  { id: 'proposta',   name: 'Proposta enviada',       color: '#F59E0B' },
  { id: 'negociacao', name: 'Negociação',              color: '#F97316' },
  { id: 'ganho',      name: 'Ganho',                  color: '#16A34A', type: 'won' },
  { id: 'perdido',    name: 'Perdido',                color: '#E5484D', type: 'lost' },
]

export const CANAL_INFO: Record<Canal, { label: string; icon: string }> = {
  dm_instagram: { label: 'DM Instagram', icon: '📷' },
  cold_call:    { label: 'Cold call',    icon: '📞' },
  indicacao:    { label: 'Indicação',    icon: '🤝' },
  presencial:   { label: 'Presencial',   icon: '🚶' },
  outro:        { label: 'Outro',        icon: '💬' },
}

export const TEMPERATURA_INFO: Record<Temperatura, { label: string; tone: 'danger' | 'warn' | 'ok' }> = {
  frio:   { label: '🧊 Frio',   tone: 'danger' },
  morno:  { label: '🌤️ Morno', tone: 'warn' },
  quente: { label: '🔥 Quente', tone: 'ok' },
}

export const FIT_INFO: Record<Fit, { label: string; tone: 'ok' | 'warn' | 'danger' }> = {
  alto:   { label: 'Fit alto',   tone: 'ok' },
  medio:  { label: 'Fit médio',  tone: 'warn' },
  baixo:  { label: 'Fit baixo',  tone: 'danger' },
}

export const TEM_VERBA_INFO: Record<TemVerba, string> = {
  sim:         'Tem verba',
  nao:         'Não tem verba',
  a_confirmar: 'A confirmar',
}

export const INVESTE_TRAFEGO_INFO: Record<InvesteTrafego, string> = {
  nunca:          'Nunca investiu',
  mal:            'Já investiu e foi mal',
  bem_com_outro:  'Investe bem com outra agência',
}

export type ContactLog = {
  id: string
  prospect_id: string
  user_id: string
  user_name: string
  canal: Canal
  note: string
  contacted_at: string
}

export const MOTIVOS_PERDA = [
  'Sem verba',
  'Sem fit com o serviço',
  'Fechou com concorrente',
  'Não respondeu / sumiu',
  'Não é o decisor',
  'Achou caro',
  'Outro',
]

// Dias parado em "Perdido" após os quais o card volta a aparecer como
// candidato a reabordagem na coluna Prospect.
export const REACTIVATION_DAYS = 30

export function daysSince(iso: string | null) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}
