import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNavServer from '@/components/TopNavServer'
import FunilBoard from './FunilBoard'
import type { Profile } from '@/lib/rbac'
import type { Prospect } from '@/lib/prospects'

export const metadata = { title: 'Funil de Prospecção · Radar CRM' }

export default async function FunilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role_id, roles(nome, permissions)')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as unknown as Profile | null
  const userName  = typedProfile?.full_name || typedProfile?.email || user.email || 'Usuário'
  const roleName  = typedProfile?.roles?.nome ?? 'SDR'
  const isManager = ['admin', 'closer'].includes(roleName.toLowerCase())

  const [prospectsRes, teamRes] = await Promise.all([
    isManager
      ? supabase.from('prospects').select('*').order('stage_since', { ascending: true })
      : supabase.from('prospects').select('*').eq('responsavel_id', user.id).order('stage_since', { ascending: true }),
    supabase.from('profiles').select('id, full_name').not('full_name', 'is', null).order('full_name'),
  ])

  const initialCards = (prospectsRes.data ?? []) as Prospect[]
  const team = (teamRes.data ?? []) as { id: string; full_name: string }[]

  return (
    <>
      <TopNavServer />
      <FunilBoard
        initialCards={initialCards}
        userId={user.id}
        userName={userName}
        isManager={isManager}
        team={team}
      />
    </>
  )
}
