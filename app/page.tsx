import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TopNavServer from '@/components/TopNavServer'
import { KpiStat } from '@/components/ui/KpiStat'
import type { Profile } from '@/lib/rbac'

export const metadata = { title: 'Painel · Radar CRM' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role_id, roles(nome, permissions)')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as unknown as Profile | null
  const displayName  = typedProfile?.full_name || typedProfile?.email || user.email || 'Usuário'
  const roleName     = typedProfile?.roles?.nome ?? 'Sem cargo definido'
  const isManager    = ['admin', 'closer'].includes(roleName.toLowerCase())

  let query = supabase.from('prospects').select('stage, valor_potencial')
  if (!isManager) query = query.eq('responsavel_id', user.id)
  const { data: rows } = await query

  const all         = rows ?? []
  const emAberto     = all.filter(r => r.stage !== 'ganho' && r.stage !== 'perdido').length
  const emReuniao    = all.filter(r => r.stage === 'reuniao').length
  const propostas    = all.filter(r => r.stage === 'proposta' || r.stage === 'negociacao').length
  const fechamentos  = all.filter(r => r.stage === 'ganho').length

  return (
    <>
      <TopNavServer />
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display font-bold text-xl text-text">Olá, {displayName.split(' ')[0]}</h1>
            <p className="text-sm text-text-dim">Cargo: {roleName}</p>
          </div>
          <Link href="/funil" className="text-sm font-semibold text-accent hover:opacity-80">
            Ir para o funil →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiStat icon="📋" label="Em aberto no funil" value={emAberto} tone="accent" />
          <KpiStat icon="🤝" label="Em reunião" value={emReuniao} tone="ok" />
          <KpiStat icon="📨" label="Proposta / negociação" value={propostas} tone="warn" />
          <KpiStat icon="🏆" label="Ganhos" value={fechamentos} tone="ok" />
        </div>
      </main>
    </>
  )
}
