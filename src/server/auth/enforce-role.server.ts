import type { AppRole } from '@/shared/types/rbac'
import { getServerRole } from './role.server'

export async function enforceServerRole(allowedRoles: AppRole[]) {
  const role = await getServerRole()
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('FORBIDDEN')
  }
  return role
}
