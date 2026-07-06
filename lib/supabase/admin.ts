import { createClient } from '@supabase/supabase-js'

// Este cliente usa a service_role key — NUNCA exposta ao navegador.
// Só importar em Server Components, Server Actions ou Route Handlers.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Variáveis de ambiente do Supabase admin não configuradas.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
