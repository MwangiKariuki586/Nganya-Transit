import { createServerFn } from '@tanstack/react-start'

export const listOwnRegistrationRequestsServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; corridorId?: string | null; limit?: number }) => data)
  .handler(async ({ data }) => {
    const registration = await import('@/server/registration/requests.server')
    const context = await registration.requireRegistrationAccess(data.accessToken)
    return registration.listOwnRegistrationRequests(context, {
      corridorId: data.corridorId || null,
      limit: data.limit,
    })
  })

export const createRegistrationRequestServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    accessToken: string
    id?: string
    corridorId: string
    proposedName: string
    plateLast4?: string | null
    plateHash?: string | null
    sacco?: string | null
    tags?: string[] | null
    media: { storagePath: string; mediaUrl: string; sortOrder: number }[]
  }) => data)
  .handler(async ({ data }) => {
    const registration = await import('@/server/registration/requests.server')
    const context = await registration.requireRegistrationAccess(data.accessToken)
    return registration.createRegistrationRequest(context, data)
  })

export const listAdminRegistrationRequestsServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; status?: string | null; limit?: number }) => data)
  .handler(async ({ data }) => {
    const registration = await import('@/server/registration/requests.server')
    const context = await registration.requireAdminRegistrationAccess(data.accessToken)
    return registration.listAdminRegistrationRequests(context, {
      status: data.status || null,
      limit: data.limit,
    })
  })

export const getAdminRegistrationReviewDataServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; requestId: string }) => data)
  .handler(async ({ data }) => {
    const registration = await import('@/server/registration/requests.server')
    const context = await registration.requireAdminRegistrationAccess(data.accessToken)
    return registration.getAdminRegistrationReviewData(context, data.requestId)
  })

export const reviewRegistrationRequestServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    accessToken: string
    requestId: string
    status: 'REJECTED' | 'NEEDS_INFO'
    reviewNotes?: string | null
  }) => data)
  .handler(async ({ data }) => {
    const registration = await import('@/server/registration/requests.server')
    const context = await registration.requireAdminRegistrationAccess(data.accessToken)
    return registration.reviewRegistrationRequest(context, data)
  })

export const approveRegistrationRequestServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; requestId: string; reviewNotes?: string | null }) => data)
  .handler(async ({ data }) => {
    const registration = await import('@/server/registration/requests.server')
    const context = await registration.requireAdminRegistrationAccess(data.accessToken)
    return registration.approveRegistrationRequest(context, data)
  })
