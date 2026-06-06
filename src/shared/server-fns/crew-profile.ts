import { createServerFn } from '@tanstack/react-start'

export const getCrewProfileServerFn = createServerFn({ method: 'GET' }).handler(async (ctx) => {
  const profileServer = await import('@/server/crew/profile.server')
  return profileServer.getCrewProfile((ctx as { request?: Request | null }).request ?? null)
})

export const updateCrewProfileServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    accessToken: string;
    full_name?: string;
    handle?: string;
    bio?: string;
    avatar_url?: string;
    cover_media_url?: string;
    cover_media_type?: 'image' | 'video';
    cover_poster_url?: string;
  }) => data)
  .handler(async ({ data }) => {
    const { accessToken, ...profileData } = data
    const profileServer = await import('@/server/crew/profile.server')
    return profileServer.updateCrewProfileWithToken(accessToken, profileData)
  })

