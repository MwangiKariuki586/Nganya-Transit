import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { normalizeRole } from '@/shared/auth/roles'
import { appError, isAppError } from '@/shared/errors/app-error'
import { AUTH_ACCESS_COOKIE } from '@/shared/auth/session-cookie'
import { getServerSupabaseUserEnv, isSupabaseConnectionError } from '@/shared/supabase/env'

export interface ServerSessionSnapshot {
  userId: string | null
  role: string | null
}

function getServerSupabaseEnv() {
  return getServerSupabaseUserEnv()
}

function createServerSupabaseClient() {
  const { url, anonKey } = getServerSupabaseEnv()

  if (!url || !anonKey) return null

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) return acc

      const key = part.slice(0, separatorIndex).trim()
      const value = part.slice(separatorIndex + 1).trim()
      acc[key] = decodeURIComponent(value)
      return acc
    }, {})
}

function extractSupabaseCookieToken(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null

  try {
    const parsed = JSON.parse(cookieValue)

    if (typeof parsed === 'string') return parsed
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0]
    if (parsed && typeof parsed === 'object' && typeof parsed.access_token === 'string') {
      return parsed.access_token
    }
  } catch {
    return null
  }

  return null
}

export function getRequestAccessToken(request?: Request | null): string | null {
  if (!request) return null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'))
  if (cookies[AUTH_ACCESS_COOKIE]) return cookies[AUTH_ACCESS_COOKIE]
  if (cookies['sb-access-token']) return cookies['sb-access-token']

  for (const [key, value] of Object.entries(cookies)) {
    if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
    const token = extractSupabaseCookieToken(value)
    if (token) return token
  }

  return null
}

export async function resolveSessionSnapshotFromRequest(
  request?: Request | null,
): Promise<ServerSessionSnapshot> {
  const accessToken = getRequestAccessToken(request)
  const supabase = createServerSupabaseClient()

  if (!accessToken || !supabase) {
    return {
      userId: null,
      role: null,
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken).catch((error: unknown) => {
    if (isSupabaseConnectionError(error)) {
      return {
        data: { user: null },
        error: appError(
          'NETWORK_ERROR',
          'Supabase auth is temporarily unreachable while resolving the current session.',
          {
            cause: error,
          },
        ),
      }
    }

    if (isAppError(error)) {
      throw error
    }

    throw appError('UNKNOWN', 'Failed to resolve the current session.', {
      cause: error,
    })
  })

  if (userError || !user) {
    return {
      userId: null,
      role: null,
    }
  }

  let role = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role)

  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    role = normalizeRole(profile?.role)
  }

  return {
    userId: user.id,
    role,
  }
}

export async function getServerSessionSnapshot(
  request?: Request | null,
): Promise<ServerSessionSnapshot> {
  return resolveSessionSnapshotFromRequest(request)
}
