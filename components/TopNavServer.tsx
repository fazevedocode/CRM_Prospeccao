import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNav from './TopNav'
import type { Profile } from '@/lib/rbac'

export default async function TopNavServer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role_id, roles(nome, permissions)')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as unknown as Profile | null
  const permissions: string[] = typedProfile?.roles?.permissions ?? []
  const displayName           = typedProfile?.full_name || typedProfile?.email || user.email || ''
  const roleName               = typedProfile?.roles?.nome ?? 'Usuário'

  return (
    <TopNav
      permissions={permissions}
      displayName={displayName}
      roleName={roleName}
    />
  )
}
