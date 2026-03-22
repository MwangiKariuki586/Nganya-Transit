import { createServerFn } from '@tanstack/react-start'

export const getCrewAccessServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const access = await import('@/server/crew/access.server')
      const context = await access.requireCrewAccess(data.accessToken)
      const [mappedNganyas, activeSession] = await Promise.all([
        access.listMappedNganyas(context),
        access.getActiveCrewSession(context),
      ])

      return {
        allowed: true,
        role: context.role,
        userId: context.userId,
        mappedNganyasCount: mappedNganyas.length,
        activeSessionId: activeSession?.id || null,
      }
    } catch (error: any) {
      return {
        allowed: false,
        reason: error?.message || 'FORBIDDEN',
        role: null,
        userId: null,
        mappedNganyasCount: 0,
        activeSessionId: null,
      }
    }
  })

export const getCrewMappedNganyasServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; corridorId?: string | null }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)
    return access.listMappedNganyas(context, data.corridorId)
  })

export const getActiveCrewSessionServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)
    return access.getActiveCrewSession(context)
  })

export const getCrewSessionServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; sessionId: string }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)
    return access.getCrewSessionById(context, data.sessionId)
  })

export const listCrewSessionHistoryServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)
    return access.listCrewSessionHistory(context, data.limit)
  })

export const startCrewSessionServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    accessToken: string
    nganyaId: string
    corridorId: string
    direction: string
    seatsLeft: number
    lastLocation: string | null
  }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)
    await access.assertMappedNganya(context, data.nganyaId)

    const activeSession = await access.getActiveCrewSession(context)
    if (activeSession) {
      return activeSession
    }

    const { data: session, error } = await (context.supabase.from('live_sessions') as any)
      .insert({
        nganya_id: data.nganyaId,
        corridor_id: data.corridorId,
        crew_user_id: context.userId,
        status: 'LIVE',
        direction: data.direction,
        seats_left: data.seatsLeft,
        last_location: data.lastLocation,
        last_ping_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    return access.getCrewSessionById(context, session.id)
  })

export const pingCrewSessionServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    accessToken: string
    sessionId: string
    seatsLeft: number
    lastLocation: string | null
    direction?: string | null
  }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)
    await access.getCrewSessionById(context, data.sessionId)

    const updatePayload: Record<string, unknown> = {
      seats_left: data.seatsLeft,
      last_ping_at: new Date().toISOString(),
      last_location: data.lastLocation,
    }

    if (data.direction) {
      updatePayload.direction = data.direction
    }

    const { error } = await (context.supabase.from('live_sessions') as any)
      .update(updatePayload)
      .eq('id', data.sessionId)

    if (error) {
      throw error
    }

    return access.getCrewSessionById(context, data.sessionId)
  })

export const stopCrewSessionServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; sessionId: string }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)
    await access.getCrewSessionById(context, data.sessionId)

    const { error } = await (context.supabase.from('live_sessions') as any)
      .update({
        status: 'OFF',
        ended_at: new Date().toISOString(),
        last_ping_at: new Date().toISOString(),
      })
      .eq('id', data.sessionId)

    if (error) {
      throw error
    }

    return { ok: true }
  })
