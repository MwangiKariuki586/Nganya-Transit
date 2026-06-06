import { createServerFn } from '@tanstack/react-start'

type LocationUploadPoint = {
  lat: number
  lng: number
  accuracy_m: number | null
  speed_mps: number | null
  heading: number | null
  captured_at: string
}

function toPostgisPoint(point: Pick<LocationUploadPoint, 'lat' | 'lng'>) {
  return `POINT(${point.lng} ${point.lat})`
}

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

    // create_live_session uses RETURN QUERY ... RETURNING id, so Supabase
    // returns an array of rows: [{ id: "uuid" }]. Handle all shapes defensively.
    const sessionId =
      Array.isArray(session)
        ? (session[0] as any)?.id
        : typeof session === 'string'
          ? session
          : (session as any)?.id

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

export const ingestCrewLocationServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    accessToken: string
    sessionId: string
    nganyaId: string
    point: LocationUploadPoint
    clientState: 'foreground' | 'backgrounded' | 'recovered' | 'offline'
    seatsLeft: number
    direction: string | null
  }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const { getServerSupabaseUserEnv } = await import('@/shared/supabase/env')
    const context = await access.requireCrewAccess(data.accessToken)
    await access.assertMappedNganya(context, data.nganyaId)
    await access.getCrewSessionById(context, data.sessionId)

    const { url, anonKey } = getServerSupabaseUserEnv()
    const body = {
      session_id: data.sessionId,
      nganya_id: data.nganyaId,
      points: [data.point],
      client_state: data.clientState,
    }

    try {
      const res = await fetch(`${url}/functions/v1/live-location-ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${data.accessToken}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`live-location-ingest ${res.status}: ${text}`)
      }

      return res.json()
    } catch (error) {
      // Keep the live session fresh even when the Edge Function is unavailable.
      const { error: pingError } = await context.supabase.rpc('update_live_session_ping', {
        p_session_id: data.sessionId,
        p_seats_left: data.seatsLeft,
        p_last_location: toPostgisPoint(data.point),
        p_direction: data.direction || null,
      })

      if (pingError) {
        throw pingError
      }

      return {
        ok: true,
        accepted: true,
        rejected_reason: null,
        server_received_at: new Date().toISOString(),
        freshness_state: 'LIVE',
        accepted_point: {
          lat: data.point.lat,
          lng: data.point.lng,
          accuracy_m: data.point.accuracy_m,
          captured_at: data.point.captured_at,
        },
        fallback_reason: error instanceof Error ? error.message : String(error),
      }
    }
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
