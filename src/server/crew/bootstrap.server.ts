import type { Database } from '@/lib/database.types'
import { normalizeRole } from '@/shared/auth/roles'
import type { CrewBootstrapPayload, CrewBootstrapSnapshot } from '@/shared/types/crew-bootstrap'
import { getRequestAccessToken } from '@/server/auth/session.server'
import { getUserScopedSupabaseClient } from '@/server/supabase/user-client.server'

type RpcResult = Database['public']['Functions']['crew_bootstrap']['Returns']

function normalizePayload(result: RpcResult, fallbackRole: unknown): CrewBootstrapPayload {
  const raw = (result && typeof result === 'object' ? result : {}) as Record<string, any>

  return {
    role: normalizeRole(raw.role ?? fallbackRole),
    assignment: raw.assignment ?? null,
    request: raw.request ?? null,
    active_session: raw.active_session ?? null,
  }
}

export async function getCrewBootstrapSnapshot(request?: Request | null): Promise<CrewBootstrapSnapshot> {
  const accessToken = getRequestAccessToken(request)
  const fetchedAt = new Date().toISOString()

  if (!accessToken) {
    return {
      userId: null,
      fetchedAt,
      bootstrap: {
        role: null,
        assignment: null,
        request: null,
        active_session: null,
      },
    }
  }

  const supabase = getUserScopedSupabaseClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    return {
      userId: null,
      fetchedAt,
      bootstrap: {
        role: null,
        assignment: null,
        request: null,
        active_session: null,
      },
    }
  }

  const { data, error } = await supabase.rpc('crew_bootstrap')

  if (error) {
    throw error
  }

  return {
    userId: user.id,
    fetchedAt,
    bootstrap: normalizePayload(data as RpcResult, user.app_metadata?.role ?? user.user_metadata?.role),
  }
}
