import { getHomePathForRole, resolveCurrentRole } from '@/shared/auth/guards'
import { redirect } from '@tanstack/react-router'

export async function requireFanRouteAccess() {
  const role = await resolveCurrentRole()

  if (!role || role === 'fan') {
    return role
  }

  throw redirect({ to: getHomePathForRole(role), replace: true })
}
