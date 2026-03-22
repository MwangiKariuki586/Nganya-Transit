import { crewMappingRepository } from '@/entities/crew-mapping/repository'
import { liveSessionRepository } from '@/entities/live-session/repository'
import { getClientAccessToken, requireClientAccessToken } from '@/shared/auth/client-session'
import { getCrewAccessServerFn } from '@/shared/server-fns/crew-live'

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
}

