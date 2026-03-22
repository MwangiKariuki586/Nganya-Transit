import type { Session } from '@supabase/supabase-js'

export const AUTH_ACCESS_COOKIE = 'matwana-access-token'

function buildCookieAttributes(maxAge: number) {
  const attributes = [
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, maxAge)}`,
  ]

  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    attributes.push('Secure')
  }

  return attributes.join('; ')
}

export function clearAuthSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_ACCESS_COOKIE}=; ${buildCookieAttributes(0)}`
}

export function syncAuthSessionCookie(session: Session | null) {
  if (typeof document === 'undefined') return

  const accessToken = session?.access_token
  if (!accessToken) {
    clearAuthSessionCookie()
    return
  }

  const expiresAt = typeof session.expires_at === 'number'
    ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000))
    : 60 * 60

  document.cookie = `${AUTH_ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; ${buildCookieAttributes(expiresAt)}`
}
