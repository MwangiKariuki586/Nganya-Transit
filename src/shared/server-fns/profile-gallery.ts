import { createServerFn } from '@tanstack/react-start'

export const getProfileGalleryServerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { getRequestAccessToken, resolveSessionSnapshotFromRequest } = await import('@/server/auth/session.server')
    const request = (context as { request?: Request }).request ?? null
    const token = getRequestAccessToken(request)
    if (!token) {
      const { authRequired } = await import('@/shared/errors/app-error')
      throw authRequired('Authentication required to view gallery')
    }
    const snapshot = await resolveSessionSnapshotFromRequest(request)
    if (!snapshot?.userId || snapshot.userId !== data.userId) {
      const { forbidden } = await import('@/shared/errors/app-error')
      throw forbidden('You can only view your own gallery')
    }
    const gallery = await import('@/server/crew/gallery.server')
    return gallery.getProfileGallery(data.userId)
  })

export const addGalleryItemServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    accessToken: string
    media_url: string
    media_type: 'image' | 'video'
    storage_path: string
  }) => data)
  .handler(async ({ data }) => {
    const { accessToken, ...input } = data
    const gallery = await import('@/server/crew/gallery.server')
    return gallery.addGalleryItem(null, input, accessToken)
  })

export const deleteGalleryItemServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; itemId: string }) => data)
  .handler(async ({ data }) => {
    const gallery = await import('@/server/crew/gallery.server')
    return gallery.deleteGalleryItem(null, data.itemId, data.accessToken)
  })

export const getNganyaCrewGalleryServerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { nganyaId: string }) => data)
  .handler(async ({ data }) => {
    const gallery = await import('@/server/crew/gallery.server')
    return gallery.getNganyaCrewGallery(data.nganyaId)
  })

export const getNganyaCrewProfileServerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { nganyaId: string }) => data)
  .handler(async ({ data }) => {
    const gallery = await import('@/server/crew/gallery.server')
    return gallery.getNganyaCrewProfile(data.nganyaId)
  })
