import { redirect } from '@tanstack/react-router'
import { getStableClientSession } from '@/shared/auth/client-session'
import { getCrewBootstrapServerFn } from '@/shared/server-fns/crew-bootstrap'
import { readCrewBootstrapCache, writeCrewBootstrapCache } from '@/modules/crew/services/bootstrap-cache'
import type { CrewBootstrapSnapshot, CrewStatusState } from '@/shared/types/crew-bootstrap'

type CrewRegisterMode = 'needs_info' | 'rejected'

function isCrewRouteRole(role: CrewBootstrapSnapshot['bootstrap']['role']) {
  return role === 'crew' || role === 'admin'
}

function getUnauthenticatedSnapshot(): CrewBootstrapSnapshot {
  return {
    userId: null,
    fetchedAt: new Date().toISOString(),
    bootstrap: {
      role: null,
      assignment: null,
      request: null,
      active_session: null,
    },
  }
}

function buildCrewEntryRedirect(snapshot: CrewBootstrapSnapshot) {
  const state = getCrewStatusState(snapshot)

  switch (state) {
    case 'LIVE_ACTIVE':
      return {
        to: '/crew/session/$id' as const,
        params: { id: snapshot.bootstrap.active_session!.id },
        search: undefined,
        replace: true,
      }
    case 'ASSIGNED':
      return {
        to: '/crew/live' as const,
        params: undefined,
        search: undefined,
        replace: true,
      }
    case 'PENDING_APPROVAL':
      return {
        to: '/crew/pending' as const,
        params: undefined,
        search: undefined,
        replace: true,
      }
    case 'NEEDS_INFO':
      return {
        to: '/crew/register' as const,
        params: undefined,
        search: { mode: 'needs_info' as CrewRegisterMode },
        replace: true,
      }
    case 'REJECTED':
      return {
        to: '/crew/register' as const,
        params: undefined,
        search: { mode: 'rejected' as CrewRegisterMode },
        replace: true,
      }
    case 'UNREGISTERED':
      return {
        to: '/crew/register' as const,
        params: undefined,
        search: undefined,
        replace: true,
      }
    case 'NOT_CREW':
      return {
        to: '/discover' as const,
        params: undefined,
        search: undefined,
        replace: true,
      }
    case 'NOT_AUTHENTICATED':
    default:
      return {
        to: '/signin' as const,
        params: undefined,
        search: { returnTo: '/crew' },
        replace: true,
      }
  }
}

export function getCrewStatusState(snapshot: CrewBootstrapSnapshot): CrewStatusState {
  if (!snapshot.userId) {
    return 'NOT_AUTHENTICATED'
  }

  if (!isCrewRouteRole(snapshot.bootstrap.role)) {
    return 'NOT_CREW'
  }

  if (snapshot.bootstrap.active_session) {
    return 'LIVE_ACTIVE'
  }

  if (snapshot.bootstrap.assignment) {
    return 'ASSIGNED'
  }

  const requestStatus = snapshot.bootstrap.request?.status

  if (requestStatus === 'PENDING') {
    return 'PENDING_APPROVAL'
  }

  if (requestStatus === 'NEEDS_INFO') {
    return 'NEEDS_INFO'
  }

  if (requestStatus === 'REJECTED') {
    return 'REJECTED'
  }

  return 'UNREGISTERED'
}

export async function loadCrewBootstrapSnapshot() {
  if (typeof window !== 'undefined') {
    const session = await getStableClientSession()
    const userId = session?.user?.id ?? null

    if (!userId) {
      return getUnauthenticatedSnapshot()
    }

    const cachedSnapshot = readCrewBootstrapCache(userId)
    if (cachedSnapshot) {
      return cachedSnapshot
    }
  }

  const snapshot = await getCrewBootstrapServerFn()
  writeCrewBootstrapCache(snapshot)
  return snapshot
}

export async function requireCrewRouteAccess(requestedPath: string) {
  const snapshot = await loadCrewBootstrapSnapshot()

  if (!snapshot.userId) {
    throw redirect({
      to: '/signin',
      search: { returnTo: requestedPath },
      replace: true,
    })
  }

  if (!isCrewRouteRole(snapshot.bootstrap.role)) {
    throw redirect({
      to: '/discover',
      replace: true,
    })
  }

  return snapshot
}

export async function resolveCrewEntryRoute() {
  const snapshot = await loadCrewBootstrapSnapshot()
  return {
    snapshot,
    redirectTarget: buildCrewEntryRedirect(snapshot),
  }
}
