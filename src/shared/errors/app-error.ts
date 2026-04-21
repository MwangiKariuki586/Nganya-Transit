export const APP_ERROR_CODES = [
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFIGURATION_ERROR',
  'NETWORK_ERROR',
  'SESSION_NOT_FOUND',
  'NOT_MAPPED',
  'UNKNOWN',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

export interface AppError {
  code: AppErrorCode
  message: string
  status?: number
  retryable: boolean
  details?: Record<string, unknown>
  cause?: unknown
}

const APP_ERROR_SENTINELS = new Set<string>([
  ...APP_ERROR_CODES,
  'AUTHENTICATION_REQUIRED',
  'REQUEST_NOT_FOUND',
  'REGISTRATION_ALREADY_EXISTS',
])

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: 'Sign in to continue.',
  FORBIDDEN: 'You do not have access to this action.',
  NOT_FOUND: 'We could not find what you were looking for.',
  VALIDATION_ERROR: 'Check your input and try again.',
  CONFIGURATION_ERROR: 'The app configuration is incomplete or invalid.',
  NETWORK_ERROR: 'Connection failed. Try again in a moment.',
  SESSION_NOT_FOUND: 'This session is no longer available.',
  NOT_MAPPED: 'This crew account is not mapped to that nganya.',
  UNKNOWN: 'Something went wrong. Try again.',
}

const STATUS_BY_CODE: Partial<Record<AppErrorCode, number>> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFIGURATION_ERROR: 500,
  SESSION_NOT_FOUND: 404,
  NOT_MAPPED: 403,
  NETWORK_ERROR: 503,
  UNKNOWN: 500,
}

const NON_RETRYABLE_CODES = new Set<AppErrorCode>([
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'CONFIGURATION_ERROR',
  'NOT_FOUND',
  'SESSION_NOT_FOUND',
  'NOT_MAPPED',
])

export function appError(
  code: AppErrorCode,
  message?: string,
  options?: {
    status?: number
    retryable?: boolean
    details?: Record<string, unknown>
    cause?: unknown
  },
): AppError {
  return {
    code,
    message: message || DEFAULT_MESSAGES[code],
    status: options?.status ?? STATUS_BY_CODE[code],
    retryable: options?.retryable ?? !NON_RETRYABLE_CODES.has(code),
    details: options?.details,
    cause: options?.cause,
  }
}

export function authRequired(message?: string) {
  return appError('AUTH_REQUIRED', message)
}

export function forbidden(message?: string) {
  return appError('FORBIDDEN', message)
}

export function notFound(message?: string) {
  return appError('NOT_FOUND', message)
}

export function validationError(message: string, details?: Record<string, unknown>) {
  return appError('VALIDATION_ERROR', message, {
    retryable: false,
    details,
  })
}

export function isAppError(error: unknown): error is AppError {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as Partial<AppError>
  return (
    typeof candidate.code === 'string' &&
    APP_ERROR_CODES.includes(candidate.code as AppErrorCode) &&
    typeof candidate.message === 'string' &&
    typeof candidate.retryable === 'boolean'
  )
}

function looksLikeNetworkError(error: { message?: string; code?: string; status?: number }) {
  const message = `${error.message || ''} ${error.code || ''}`.toLowerCase()
  return (
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timed out') ||
    message.includes('failed to fetch')
  )
}

function normalizeSentinel(message: string): AppError | null {
  const [rawCode, extra] = message.split(':')

  switch (rawCode) {
    case 'AUTH_REQUIRED':
    case 'AUTHENTICATION_REQUIRED':
    case 'Not authenticated':
      return authRequired()
    case 'FORBIDDEN':
      return forbidden()
    case 'NOT_FOUND':
    case 'REQUEST_NOT_FOUND':
      return notFound()
    case 'SESSION_NOT_FOUND':
      return appError('SESSION_NOT_FOUND')
    case 'NOT_MAPPED':
      return appError('NOT_MAPPED')
    case 'REGISTRATION_ALREADY_EXISTS':
      return validationError(
        extra
          ? `A registration already exists for this account (${extra}).`
          : 'A registration already exists for this account.',
        extra ? { existingStatus: extra } : undefined,
      )
    default:
      return null
  }
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (typeof error === 'string') {
    return normalizeSentinel(error) ?? appError('UNKNOWN', error)
  }

  if (error instanceof Error) {
    const fromSentinel = normalizeSentinel(error.message)
    if (fromSentinel) {
      return {
        ...fromSentinel,
        cause: error,
      }
    }

    const maybePostgrest = error as Error & { code?: string; status?: number; details?: string }
    if (looksLikeNetworkError(maybePostgrest)) {
      return appError('NETWORK_ERROR', DEFAULT_MESSAGES.NETWORK_ERROR, {
        cause: error,
        status: maybePostgrest.status,
      })
    }

    return appError(
      APP_ERROR_SENTINELS.has(error.message) ? 'UNKNOWN' : 'UNKNOWN',
      error.message || DEFAULT_MESSAGES.UNKNOWN,
      {
        cause: error,
      },
    )
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string
      code?: string
      status?: number
      details?: unknown
      error_description?: string
    }

    if (candidate.message) {
      const fromSentinel = normalizeSentinel(candidate.message)
      if (fromSentinel) {
        return {
          ...fromSentinel,
          cause: error,
        }
      }
    }

    if (looksLikeNetworkError(candidate)) {
      return appError('NETWORK_ERROR', DEFAULT_MESSAGES.NETWORK_ERROR, {
        cause: error,
        status: candidate.status,
      })
    }

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return appError('UNKNOWN', candidate.message, {
        cause: error,
        status: candidate.status,
        details: typeof candidate.details === 'object' ? (candidate.details as Record<string, unknown>) : undefined,
      })
    }
  }

  return appError('UNKNOWN', DEFAULT_MESSAGES.UNKNOWN, {
    cause: error,
  })
}

export function getUserMessage(error: AppError) {
  if (error.code === 'UNKNOWN') {
    return DEFAULT_MESSAGES.UNKNOWN
  }

  return error.message || DEFAULT_MESSAGES[error.code]
}

export function shouldRedirectForError(error: AppError) {
  return error.code === 'AUTH_REQUIRED' || error.code === 'FORBIDDEN'
}
