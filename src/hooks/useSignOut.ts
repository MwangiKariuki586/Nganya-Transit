/**
 * useSignOut — shared sign-out hook for all modules.
 *
 * Handles the base sign-out flow:
 *   1. supabase.auth.signOut()
 *   2. clearAuthSessionCookie()
 *   3. invalidate the role cache
 *   4. router.invalidate() + navigate to destination
 *
 * The crew module extends this by stopping an active session before
 * calling signOut — see CrewNav.tsx for that usage.
 */

import { useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { clearAuthSessionCookie } from '@/shared/auth/session-cookie'
import { useAuthStore } from '@/stores/useAuthStore'

export interface UseSignOutOptions {
  /** Route to navigate to after sign-out. Defaults to '/'. */
  redirectTo?: string
  /** Extra search params to clear on the redirect target. */
  clearSearch?: Record<string, undefined>
}

export function useSignOut(options: UseSignOutOptions = {}) {
  const navigate = useNavigate()
  const router = useRouter()

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    clearAuthSessionCookie()
    useAuthStore.getState().invalidateRole()
    await router.invalidate()

    const { redirectTo = '/', clearSearch } = options

    navigate({
      to: redirectTo as any,
      ...(clearSearch ? { search: clearSearch } : {}),
      replace: true,
    })
  }, [navigate, router, options])

  return signOut
}
