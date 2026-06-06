import type { Session } from '@supabase/supabase-js'
import { browserSupabase } from '@/shared/supabase/browser-client'
import { authRequired } from '@/shared/errors/app-error'
import { reportAppError } from '@/shared/errors/reporting'

let pendingSessionResolution: Promise<Session | null> | null = null

async function waitForInitialSession(timeoutMs: number = 400): Promise<Session | null> {
  if (pendingSessionResolution) {
    return pendingSessionResolution
  }

  pendingSessionResolution = new Promise<Session | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      subscription.unsubscribe()
      pendingSessionResolution = null
      resolve(null)
    }, timeoutMs)

    const {
      data: { subscription },
    } = browserSupabase.auth.onAuthStateChange((event, session) => {
      if (!['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_OUT'].includes(event)) {
        return
      }

      window.clearTimeout(timeout)
      subscription.unsubscribe()
      pendingSessionResolution = null
      resolve(session ?? null)
    })
  })

  return pendingSessionResolution
}

export async function getStableClientSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await browserSupabase.auth.getSession().catch((error) => {
    reportAppError(error, {
      area: 'render',
      action: 'client-session:get-session',
    })

    return {
      data: { session: null },
      error,
    }
  })

  if (session) {
    return session
  }

  if (typeof window === 'undefined') {
    return null
  }

  return waitForInitialSession()
}

export async function getClientAccessToken(): Promise<string | null> {
  const session = await getStableClientSession()
  return session?.access_token || null
}

export async function requireClientAccessToken(): Promise<string> {
  const accessToken = await getClientAccessToken()
  if (!accessToken) {
    throw authRequired()
  }

  return accessToken
}
