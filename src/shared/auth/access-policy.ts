import type { AppRole } from '@/shared/types/rbac'

export type RouteAudience = AppRole | 'guest' | 'public'

const FAN_EXACT_PATHS = new Set([
  '/',
  '/discover',
  '/following',
  '/profile',
  '/spot',
  '/create-nganya',
])

export function getHomePathForRole(role: AppRole): string {
  switch (role) {
    case 'crew':
      return '/crew'
    case 'admin':
      return '/admin'
    case 'fan':
    default:
      return '/'
  }
}

export function getRouteAudience(pathname: string): RouteAudience {
  if (pathname === '/signin' || pathname === '/signup') {
    return 'guest'
  }

  if (pathname.startsWith('/crew')) {
    return 'crew'
  }

  if (pathname.startsWith('/admin')) {
    return 'admin'
  }

  if (pathname.startsWith('/nganya/')) {
    return 'fan'
  }

  if (FAN_EXACT_PATHS.has(pathname)) {
    return 'fan'
  }

  return 'public'
}

export function getRedirectPathForAudience(
  pathname: string,
  role: AppRole | null,
): string | null {
  const audience = getRouteAudience(pathname)

  if (audience === 'public') {
    return null
  }

  if (audience === 'guest') {
    return role ? getHomePathForRole(role) : null
  }

  if (!role) {
    return '/signin'
  }

  if (role !== audience) {
    return getHomePathForRole(role)
  }

  return null
}
