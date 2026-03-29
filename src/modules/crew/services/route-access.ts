import { redirect } from '@tanstack/react-router'
import { getStableClientSession } from '@/shared/auth/client-session'
import { getCrewBootstrapServerFn } from '@/shared/server-fns/crew-bootstrap'
import { useCrewStore } from '@/stores/useCrewStore'
import type { CrewBootstrapSnapshot, CrewStatusState } from '@/shared/types/crew-bootstrap'

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

    // Use Zustand store to get cached bootstrap data
    const store = useCrewStore.getState()
    const cachedSnapshot = store.bootstrap

    // Check if cache is fresh and valid
    if (cachedSnapshot && !store.isStale() && cachedSnapshot.userId === userId) {
      return cachedSnapshot
    }
  }

  const snapshot = await getCrewBootstrapServerFn()
  
  // Update Zustand store with fresh data
  if (typeof window !== 'undefined') {
    useCrewStore.getState().setBootstrap(snapshot)
  }
  
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
