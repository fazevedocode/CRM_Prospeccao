export type ProspectOption = {
  id: string
  empresa: string
  nicho: string | null
}

export type DiagnosticoRow = {
  id: string
  prospect_id: string | null
  nome_negocio: string
  categoria: string | null
  observacao: string | null
  assinatura: string | null
  nota: number
  created_at: string
  prospects: { empresa: string } | null
}
