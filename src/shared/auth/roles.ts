import type { AppRole } from '@/shared/types/rbac'

const ROLE_SET = new Set<AppRole>(['fan', 'crew', 'admin'])

export function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') return null
  const role = value.toLowerCase() as AppRole
  return ROLE_SET.has(role) ? role : null
}
