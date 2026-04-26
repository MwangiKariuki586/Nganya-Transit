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

    // Use RPC to properly cast geography type
    const { data: session, error } = await context.supabase.rpc('create_live_session', {
      p_nganya_id: data.nganyaId,
      p_corridor_id: data.corridorId,
      p_crew_user_id: context.userId,
      p_direction: data.direction,
      p_seats_left: data.seatsLeft,
      p_last_location: data.lastLocation,
    })

    if (error) {
      throw error
    }

    const sessionId = typeof session === 'string' ? session : session?.id
    if (!sessionId) {
      throw new Error('RPC create_live_session returned no session id')
    }

    return access.getCrewSessionById(context, sessionId)
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

    // Use RPC to properly cast geography type
    const { error } = await context.supabase.rpc('update_live_session_ping', {
      p_session_id: data.sessionId,
      p_seats_left: data.seatsLeft,
      p_last_location: data.lastLocation,
      p_direction: data.direction || null,
    })

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
