export type RoleName = 'Admin' | 'SDR' | 'Closer' | string

export type Profile = {
  full_name: string | null
  email: string | null
  role_id: string | null
  roles: { nome: RoleName; permissions: string[] } | null
}

export function hasPerm(perms: Set<string>, perm?: string | string[]): boolean {
  if (!perm) return true
  return Array.isArray(perm) ? perm.some(p => perms.has(p)) : perms.has(perm)
}
