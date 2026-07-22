import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNavServer from '@/components/TopNavServer'
import DiagnosticoPanel from './DiagnosticoPanel'
import type { ProspectOption, DiagnosticoRow } from './types'

export const metadata = { title: 'Diagnóstico de Ficha do Google · Radar CRM' }

export default async function DiagnosticoGooglePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [prospectsRes, diagnosticosRes] = await Promise.all([
    supabase.from('prospects').select('id, empresa, nicho').order('empresa'),
    supabase
      .from('diagnosticos_google')
      .select('id, prospect_id, nome_negocio, categoria, observacao, assinatura, nota, created_at, prospects(empresa)')
      .order('created_at', { ascending: false }),
  ])

  const prospects = (prospectsRes.data ?? []) as ProspectOption[]
  const diagnosticos = (diagnosticosRes.data ?? []) as unknown as DiagnosticoRow[]

  return (
    <>
      <TopNavServer />
      <DiagnosticoPanel prospects={prospects} initialDiagnosticos={diagnosticos} />
    </>
  )
}
