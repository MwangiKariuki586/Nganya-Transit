import { enforceRouteRole } from '@/shared/auth/guards'

export async function requireAdminRouteAccess() {
  return enforceRouteRole(['admin'])
}
