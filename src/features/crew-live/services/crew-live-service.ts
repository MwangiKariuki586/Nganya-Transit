import { crewMappingRepository } from '@/entities/crew-mapping/repository'
import { liveSessionRepository } from '@/entities/live-session/repository'
import { getClientAccessToken, requireClientAccessToken } from '@/shared/auth/client-session'
import { getCrewAccessServerFn } from '@/shared/server-fns/crew-live'
import { getBrowserSupabaseEnv } from '@/shared/supabase/env'
import type { LocationUploadPayload, ClientState } from '@/modules/crew/lib/location-upload'

// ─── Edge Function response shape ────────────────────────────────────────────

export interface IngestLocationResponse {
  ok: boolean
  accepted: boolean
  rejected_reason: string | null
  server_received_at: string
  freshness_state: 'LIVE' | 'AGING' | 'STALE' | 'EXPIRED'
  accepted_point?: {
    lat: number
    lng: number
    accuracy_m: number | null
    captured_at: string
  }
}

export const crewLiveService = {
  async getRouteAccess() {
    const accessToken = await getClientAccessToken()
    if (!accessToken) {
      return {
        allowed: false,
        reason: 'AUTH_REQUIRED',
        activeSessionId: null,
        mappedNganyasCount: 0,
      }
    }

    return getCrewAccessServerFn({
      data: { accessToken },
    })
  },

  async getSetupData() {
    const accessToken = await requireClientAccessToken()
    const [mappedNganyas, activeSession] = await Promise.all([
      crewMappingRepository.listMappedNganyas({
        data: { accessToken, corridorId: null },
      }),
      liveSessionRepository.getActiveCrewSession({
        data: { accessToken },
      }),
    ])

    return {
      assignment: mappedNganyas?.[0] || null,
      mappedNganyas: mappedNganyas || [],
      activeSession,
    }
  },

  async getMappedNganyas(corridorId?: string | null) {
    const accessToken = await requireClientAccessToken()
    return crewMappingRepository.listMappedNganyas({
      data: { accessToken, corridorId: corridorId || null },
    })
  },

  async getActiveSession() {
    const accessToken = await requireClientAccessToken()
    return liveSessionRepository.getActiveCrewSession({
      data: { accessToken },
    })
  },

  async getSession(sessionId: string) {
    const accessToken = await requireClientAccessToken()
    return liveSessionRepository.getCrewSessionById({
      data: { accessToken, sessionId },
    })
  },

  async startSession(payload: {
    nganyaId: string
    corridorId: string
    direction: string
    seatsLeft: number
    lastLocation: string | null
  }) {
    const accessToken = await requireClientAccessToken()
    return liveSessionRepository.startCrewSession({
      data: { accessToken, ...payload },
    })
  },

  async pingSession(payload: {
    sessionId: string
    seatsLeft: number
    lastLocation: string | null
    direction?: string | null
  }) {
    const accessToken = await requireClientAccessToken()
    return liveSessionRepository.pingCrewSession({
      data: { accessToken, ...payload },
    })
  },

  async stopSession(sessionId: string) {
    const accessToken = await requireClientAccessToken()
    return liveSessionRepository.stopCrewSession({
      data: { accessToken, sessionId },
    })
  },

  async listHistory(limit?: number) {
    const accessToken = await requireClientAccessToken()
    return liveSessionRepository.listCrewHistory({
      data: { accessToken, limit },
    })
  },

  /**
   * Send a location update to the live-location-ingest Edge Function.
   *
   * This is the canonical path for all location uploads from Unit 02 onward.
   * The Edge Function validates ownership, rejects bad points, updates
   * live_sessions, inserts sparse history, and broadcasts to fan map channels.
   *
   * Falls back to pingSession if the Edge Function is unreachable (e.g. cold
   * start timeout) so the session stays alive during transient failures.
   */
  async ingestLocation(payload: {
    sessionId: string
    nganyaId: string
    point: LocationUploadPayload
    clientState: ClientState
    /** Current seats_left — included so the Edge Function can write to live_pings */
    seatsLeft: number
    /** Current direction — passed through for context */
    direction: string | null
  }): Promise<IngestLocationResponse> {
    const accessToken = await requireClientAccessToken()
    const { url } = getBrowserSupabaseEnv()

    const body = {
      session_id: payload.sessionId,
      nganya_id: payload.nganyaId,
      points: [payload.point],
      client_state: payload.clientState,
    }

    const res = await fetch(`${url}/functions/v1/live-location-ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`live-location-ingest ${res.status}: ${text}`)
    }

    return res.json() as Promise<IngestLocationResponse>
  },
}

