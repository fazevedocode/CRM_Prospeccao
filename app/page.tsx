import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNavServer from '@/components/TopNavServer'
import { KpiStat } from '@/components/ui/KpiStat'
import { Card } from '@/components/ui/Card'
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

  return (
    <>
      <TopNavServer />
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <h1 className="font-display font-bold text-xl text-text">Olá, {displayName.split(' ')[0]}</h1>
          <p className="text-sm text-text-dim">Cargo: {roleName}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiStat icon="📋" label="Prospects no funil" value="–" tone="accent" />
          <KpiStat icon="🤝" label="Reuniões na semana" value="–" tone="ok" />
          <KpiStat icon="📨" label="Propostas enviadas" value="–" tone="warn" />
          <KpiStat icon="🏆" label="Fechamentos no mês" value="–" tone="ok" />
        </div>

        <Card className="p-6 text-center">
          <p className="text-text-dim text-sm">
            Base do Radar CRM pronta. O funil de prospecção (Kanban), o card do prospect e os
            scripts com IA chegam nas próximas fases.
          </p>
        </Card>
      </main>
    </>
  )
}
