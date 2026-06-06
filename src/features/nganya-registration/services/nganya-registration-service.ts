import { browserSupabase } from '@/shared/supabase/browser-client'
import { nganyaRegistrationRepository } from '@/entities/nganya-registration/repository'
import { requireClientAccessToken } from '@/shared/auth/client-session'
import { authRequired } from '@/shared/errors/app-error'

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-').replace(/-+/g, '-')
}

export interface RegistrationUploadItem {
  storagePath: string
  mediaUrl: string
  sortOrder: number
}

export const nganyaRegistrationService = {
  async listMyRequests(options?: { corridorId?: string | null; limit?: number }) {
    const accessToken = await requireClientAccessToken()
    return nganyaRegistrationRepository.listMine({
      data: {
        accessToken,
        corridorId: options?.corridorId || null,
        limit: options?.limit,
      },
    })
  },

  async submitRequest(payload: {
    id?: string
    corridorId: string
    proposedName: string
    plateLast4?: string | null
    plateHash?: string | null
    sacco?: string | null
    tags?: string[] | null
    media: RegistrationUploadItem[]
  }) {
    const accessToken = await requireClientAccessToken()
    return nganyaRegistrationRepository.create({
      data: {
        accessToken,
        ...payload,
      },
    })
  },

  async listAdminRequests(options?: { status?: string | null; limit?: number }) {
    const accessToken = await requireClientAccessToken()
    return nganyaRegistrationRepository.listAdmin({
      data: {
        accessToken,
        status: options?.status || null,
        limit: options?.limit,
      },
    })
  },

  async getAdminReviewData(requestId: string) {
    const accessToken = await requireClientAccessToken()
    return nganyaRegistrationRepository.getAdminReviewData({
      data: {
        accessToken,
        requestId,
      },
    })
  },

  async reviewRequest(payload: { requestId: string; status: 'REJECTED' | 'NEEDS_INFO'; reviewNotes?: string | null }) {
    const accessToken = await requireClientAccessToken()
    return nganyaRegistrationRepository.review({
      data: {
        accessToken,
        ...payload,
      },
    })
  },

  async approveRequest(payload: { requestId: string; reviewNotes?: string | null }) {
    const accessToken = await requireClientAccessToken()
    return nganyaRegistrationRepository.approve({
      data: {
        accessToken,
        ...payload,
      },
    })
  },

  async uploadRequestMedia(requestId: string, files: File[]) {
    const {
      data: { user },
      error: userError,
    } = await browserSupabase.auth.getUser()

    if (userError || !user) {
      throw authRequired()
    }

    const uploads: RegistrationUploadItem[] = []

    for (const [index, file] of files.entries()) {
      const storagePath = `${user.id}/registration-requests/${requestId}/${Date.now()}-${index}-${sanitizeFileName(file.name)}`
      const { error: uploadError } = await browserSupabase.storage
        .from('nganya-media')
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || 'image/jpeg',
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = browserSupabase.storage.from('nganya-media').getPublicUrl(storagePath)

      uploads.push({
        storagePath,
        mediaUrl: publicUrl,
        sortOrder: index,
      })
    }

    return uploads
  },
}
