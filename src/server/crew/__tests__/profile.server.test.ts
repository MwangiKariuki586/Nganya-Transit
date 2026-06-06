import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRequestAccessToken = vi.fn()
const getUser = vi.fn()
const profileSingle = vi.fn()
const profileEq = vi.fn(() => ({
  single: profileSingle,
}))
const profileSelect = vi.fn(() => ({
  eq: profileEq,
}))
const from = vi.fn(() => ({
  select: profileSelect,
}))

vi.mock('@/server/auth/session.server', () => ({
  getRequestAccessToken,
}))

vi.mock('@/server/supabase/user-client.server', () => ({
  getUserScopedSupabaseClient: vi.fn(() => ({
    auth: {
      getUser,
    },
    from,
  })),
}))

describe('getCrewProfile', () => {
  beforeEach(() => {
    getRequestAccessToken.mockReset()
    getUser.mockReset()
    profileSingle.mockReset()
    profileEq.mockClear()
    profileSelect.mockClear()
    from.mockClear()

    getRequestAccessToken.mockReturnValue('test-token')
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })
  })

  it('loads the current crew profile media shape', async () => {
    profileSingle.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        handle: 'matwana',
        full_name: 'Matwana Crew',
        avatar_url: null,
        bio: null,
        role: 'crew',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: null,
        cover_media_url: 'https://cdn.example.com/cover.jpg',
        cover_media_type: 'image',
        cover_poster_url: null,
      },
      error: null,
    })

    const { getCrewProfile } = await import('@/server/crew/profile.server')

    await expect(getCrewProfile(null)).resolves.toMatchObject({
      id: 'user-1',
      handle: 'matwana',
      cover_media_url: 'https://cdn.example.com/cover.jpg',
      cover_media_type: 'image',
      cover_poster_url: null,
    })

    expect(profileSelect).toHaveBeenNthCalledWith(
      1,
      expect.not.stringContaining('cover_position_x'),
    )
  })
})
