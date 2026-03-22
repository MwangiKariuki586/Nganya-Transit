import type { AppRole } from '@/shared/types/rbac'
import { getServerRole } from './role.server'

export async function enforceServerRole(allowedRoles: AppRole[], request?: Request | null) {
  const role = await getServerRole(request)
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('FORBIDDEN')
  }
  return role
}
