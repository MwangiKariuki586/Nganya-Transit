import { enforceRouteRole } from '@/shared/auth/guards'

export async function requireFanRouteAccess() {
  return enforceRouteRole(['fan'])
}
