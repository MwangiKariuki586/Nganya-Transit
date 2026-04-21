import { describe, expect, it } from 'vitest'
import {
  getServerSupabaseServiceRoleEnv,
  getServerSupabaseUserEnv,
  isSupabaseConnectionError,
} from '@/shared/supabase/env'

describe('supabase env validation', () => {
  it('prefers server-scoped variables and normalizes the url origin', () => {
    const env = getServerSupabaseUserEnv({
      SUPABASE_URL: 'https://example.supabase.co/',
      SUPABASE_ANON_KEY: ' test-anon-key ',
      VITE_SUPABASE_URL: 'https://ignored.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'ignored-key',
    })

    expect(env).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'test-anon-key',
    })
  })

  it('rejects placeholder supabase urls', () => {
    expect(() =>
      getServerSupabaseUserEnv({
        VITE_SUPABASE_URL: 'https://your-project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }),
    ).toThrow(/placeholder/i)
  })

  it('requires the service role key for privileged clients', () => {
    expect(() =>
      getServerSupabaseServiceRoleEnv({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
      }),
    ).toThrow(/service-role key/i)
  })
})

describe('isSupabaseConnectionError', () => {
  it('matches dns resolution failures from node fetch', () => {
    expect(
      isSupabaseConnectionError(
        new Error(
          'TypeError: fetch failed\nCaused by: Error: getaddrinfo ENOTFOUND example.supabase.co',
        ),
      ),
    ).toBe(true)
  })

  it('does not treat arbitrary errors as connection failures', () => {
    expect(isSupabaseConnectionError(new Error('Invalid login credentials'))).toBe(false)
  })
})
