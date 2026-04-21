import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser,
    },
  })),
}))

describe('resolveSessionSnapshotFromRequest', () => {
  beforeEach(() => {
    getUser.mockReset()
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  })

  it('treats Supabase DNS failures as an anonymous session', async () => {
    getUser.mockRejectedValueOnce(
      new Error(
        'TypeError: fetch failed\nCaused by: Error: getaddrinfo ENOTFOUND example.supabase.co',
      ),
    )

    const { resolveSessionSnapshotFromRequest } = await import('@/server/auth/session.server')

    await expect(
      resolveSessionSnapshotFromRequest(
        new Request('https://matwana.test', {
          headers: {
            authorization: 'Bearer test-token',
          },
        }),
      ),
    ).resolves.toEqual({
      userId: null,
      role: null,
    })
  })
})
