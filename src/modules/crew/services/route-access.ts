import { getClientAccessToken } from '@/shared/auth/client-session'
import { enforceRouteRole } from '@/shared/auth/guards'
import { getCrewAccessServerFn } from '@/shared/server-fns/crew-live'

export interface CrewEntryState {
  allowed: boolean
  role: 'crew' | 'admin' | null
  userId: string | null
  mappedNganyasCount: number
  activeSessionId: string | null
}

export async function getCrewRouteAccess() {
  return enforceRouteRole(['crew'])
}

export async function requireCrewRouteAccess() {
  return getCrewRouteAccess()
}

export async function getCrewEntryState(): Promise<CrewEntryState | null> {
  const accessToken = await getClientAccessToken()

  if (!accessToken) {
    return null
  }

  return getCrewAccessServerFn({
    data: { accessToken },
  })
}

export async function resolveCrewEntryRedirect() {
  const access = await getCrewEntryState()

  if (!access) {
    return null
  }

  if (!access.allowed) {
    return null
  }

  if (access.mappedNganyasCount === 0) {
    return {
      to: '/crew/register' as const,
      params: undefined,
      search: { reason: 'mapping-required' as const },
      replace: true,
    }
  }

  return null
}

export async function resolveCrewRegisterRouteRedirect() {
  const access = await getCrewEntryState()

  if (!access) {
    return null
  }

  if (!access.allowed) {
    return null
  }

  if (access.activeSessionId) {
    return {
      to: '/crew/live' as const,
      params: undefined,
      search: undefined,
      replace: true,
    }
  }

  if (access.mappedNganyasCount > 0) {
    return {
      to: '/crew/live' as const,
      params: undefined,
      search: undefined,
      replace: true,
    }
  }

  return null
}
