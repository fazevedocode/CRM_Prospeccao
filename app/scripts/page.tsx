import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNavServer from '@/components/TopNavServer'
import ScriptsPanel from './ScriptsPanel'
import type { ScriptRow } from '@/lib/scripts'

export const metadata = { title: 'Scripts · Radar CRM' }

export default async function ScriptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('scripts')
    .select('id, nome, categoria, canal, ordem, body, ativo')
    .eq('ativo', true)
    .order('categoria')
    .order('ordem')

  return (
    <>
      <TopNavServer />
      <ScriptsPanel scripts={(data ?? []) as ScriptRow[]} />
    </>
  )
}
