export type ScriptRow = {
  id: string
  nome: string
  categoria: string
  canal: string
  ordem: number
  body: string
  ativo: boolean
}

// Substitui as variáveis do script pelos dados reais do prospect.
export function fillScriptVars(
  body: string,
  data: { empresa?: string | null; decisor?: string | null; nicho?: string | null },
): string {
  return body
    .replace(/\[EMPRESA\]/g, data.empresa?.trim() || '[EMPRESA]')
    .replace(/\[DECISOR\]/g, data.decisor?.trim() || '[DECISOR]')
    .replace(/\[NICHO\]/g, data.nicho?.trim() || '[NICHO]')
}
