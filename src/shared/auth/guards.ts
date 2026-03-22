import { browserSupabase } from '@/shared/supabase/browser-client'
import { getStableClientSession } from '@/shared/auth/client-session'
import { normalizeRole } from '@/shared/auth/roles'
import type { AppRole } from '@/shared/types/rbac'
import { redirect } from '@tanstack/react-router'
import { getCurrentRoleServerFn } from '@/shared/server-fns/auth'
import { getHomePathForRole } from '@/shared/auth/access-policy'

export { getHomePathForRole } from '@/shared/auth/access-policy'

export async function resolveClientRole(): Promise<AppRole | null> {
  const session = await getStableClientSession()
  const user = session?.user
  if (!user) return null

  const { data: profile, error } = await browserSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!error) {
    const profileRole = normalizeRole(profile?.role)
    if (profileRole) return profileRole
  }

  return normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role)
}

export async function resolveCurrentRole(): Promise<AppRole | null> {
  if (typeof window !== 'undefined') {
    return resolveClientRole()
  }

  try {
    const serverRole = await getCurrentRoleServerFn()
    if (serverRole) {
      return serverRole
    }
  } catch {
    // Fall through to unauthenticated server state.
  }

  return null
}

export async function hasAnyRole(roles: AppRole[]): Promise<boolean> {
  const role = await resolveClientRole()
  if (!role) return false
  return roles.includes(role)
}

export async function enforceClientRole(roles: AppRole[]) {
  const role = await resolveClientRole()
  if (!role || !roles.includes(role)) {
    throw redirect({ to: '/signin' })
  }
  return role
}

export async function enforceRouteRole(roles: AppRole[]) {
  const role = await resolveCurrentRole()

  if (!role) {
    if (typeof window === 'undefined') {
      return null
    }

    throw redirect({ to: '/signin' })
  }

  if (!roles.includes(role)) {
    throw redirect({ to: getHomePathForRole(role) })
  }

  return role
}

export async function enforceGuestOnlyRoute() {
  const role = await resolveCurrentRole()

  if (!role) {
    return null
  }

  throw redirect({ to: getHomePathForRole(role) })
}
