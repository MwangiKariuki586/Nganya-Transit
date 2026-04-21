import { appError } from '@/shared/errors/app-error'

type SupabasePublicEnv = {
  url: string
  anonKey: string
}

type SupabaseServiceRoleEnv = {
  url: string
  serviceRoleKey: string
}

const PLACEHOLDER_HOSTS = new Set([
  'your-project.supabase.co',
  'your-project-id.supabase.co',
])

function cleanEnvValue(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlaceholderUrl(hostname: string) {
  return PLACEHOLDER_HOSTS.has(hostname.toLowerCase())
}

function validateSupabaseUrl(rawUrl: string, source: string) {
  const value = cleanEnvValue(rawUrl)

  if (!value) {
    throw appError('CONFIGURATION_ERROR', `Missing Supabase URL. Set ${source}.`, {
      retryable: false,
      details: { source },
    })
  }

  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw appError('CONFIGURATION_ERROR', `Invalid Supabase URL in ${source}.`, {
      retryable: false,
      details: { source, value },
    })
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw appError('CONFIGURATION_ERROR', `Invalid Supabase URL in ${source}.`, {
      retryable: false,
      details: { source, value },
    })
  }

  if (isPlaceholderUrl(parsed.hostname)) {
    throw appError('CONFIGURATION_ERROR', `Supabase URL in ${source} is still a placeholder.`, {
      retryable: false,
      details: { source, value },
    })
  }

  return parsed.origin
}

function validateSupabaseKey(rawKey: string, source: string, label: string) {
  const value = cleanEnvValue(rawKey)

  if (!value) {
    throw appError('CONFIGURATION_ERROR', `Missing ${label}. Set ${source}.`, {
      retryable: false,
      details: { source },
    })
  }

  return value
}

export function getBrowserSupabaseEnv(env: ImportMetaEnv = import.meta.env): SupabasePublicEnv {
  return {
    url: validateSupabaseUrl(env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL'),
    anonKey: validateSupabaseKey(
      env.VITE_SUPABASE_ANON_KEY,
      'VITE_SUPABASE_ANON_KEY',
      'Supabase anon/publishable key',
    ),
  }
}

export function getServerSupabaseUserEnv(
  env: NodeJS.ProcessEnv = process.env,
): SupabasePublicEnv {
  const urlSource = cleanEnvValue(env.SUPABASE_URL) ? 'SUPABASE_URL' : 'VITE_SUPABASE_URL'
  const anonKeySource = cleanEnvValue(env.SUPABASE_ANON_KEY)
    ? 'SUPABASE_ANON_KEY'
    : 'VITE_SUPABASE_ANON_KEY'

  return {
    url: validateSupabaseUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '', urlSource),
    anonKey: validateSupabaseKey(
      env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '',
      anonKeySource,
      'Supabase anon/publishable key',
    ),
  }
}

export function getServerSupabaseServiceRoleEnv(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseServiceRoleEnv {
  const urlSource = cleanEnvValue(env.SUPABASE_URL) ? 'SUPABASE_URL' : 'VITE_SUPABASE_URL'

  return {
    url: validateSupabaseUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '', urlSource),
    serviceRoleKey: validateSupabaseKey(
      env.SUPABASE_SERVICE_ROLE_KEY || '',
      'SUPABASE_SERVICE_ROLE_KEY',
      'Supabase service-role key',
    ),
  }
}

export function isSupabaseConnectionError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.message} ${String((error as Error & { cause?: unknown }).cause || '')}`
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)

  const normalized = message.toLowerCase()

  return (
    normalized.includes('getaddrinfo enotfound') ||
    normalized.includes('enotfound') ||
    normalized.includes('eai_again') ||
    normalized.includes('dns') ||
    normalized.includes('fetch failed')
  )
}
