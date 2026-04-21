import { useEffect } from 'react'
import { browserSupabase } from '@/shared/supabase/browser-client'
import { syncAuthSessionCookie } from '@/shared/auth/session-cookie'
import { reportAppError } from '@/shared/errors/reporting'

export function AuthSessionBridge() {
  useEffect(() => {
    let active = true

    browserSupabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        syncAuthSessionCookie(session)
      })
      .catch((error) => {
        if (!active) return
        syncAuthSessionCookie(null)
        reportAppError(error, {
          area: 'render',
          action: 'auth-session-bridge:get-session',
        })
      })

    const {
      data: { subscription },
    } = browserSupabase.auth.onAuthStateChange((_event, session) => {
      syncAuthSessionCookie(session)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return null
}
