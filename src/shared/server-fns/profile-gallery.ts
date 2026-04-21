import { createServerFn } from '@tanstack/react-start'

export const getProfileGalleryServerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
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
