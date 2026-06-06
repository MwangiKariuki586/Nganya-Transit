import { describe, expect, it } from 'vitest'
import {
  authRequired,
  getUserMessage,
  toAppError,
  validationError,
} from '@/shared/errors/app-error'

describe('app-error', () => {
  it('normalizes legacy sentinel errors', () => {
    const normalized = toAppError(new Error('FORBIDDEN'))

    expect(normalized.code).toBe('FORBIDDEN')
    expect(normalized.retryable).toBe(false)
  })

  it('normalizes auth-required objects', () => {
    const normalized = toAppError(authRequired())

    expect(normalized.code).toBe('AUTH_REQUIRED')
    expect(getUserMessage(normalized)).toBe('Sign in to continue.')
  })

  it('maps validation errors without retry', () => {
    const normalized = toAppError(validationError('Bad input'))

    expect(normalized.code).toBe('VALIDATION_ERROR')
    expect(normalized.retryable).toBe(false)
    expect(normalized.message).toBe('Bad input')
  })

  it('maps fetch failures to network errors', () => {
    const normalized = toAppError(new Error('Failed to fetch'))

    expect(normalized.code).toBe('NETWORK_ERROR')
    expect(normalized.retryable).toBe(true)
  })

  it('falls back unknown errors safely', () => {
    const normalized = toAppError({ status: 500 })

    expect(normalized.code).toBe('UNKNOWN')
    expect(getUserMessage(normalized)).toBe('Something went wrong. Try again.')
  })
})
