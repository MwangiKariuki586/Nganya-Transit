import { useCallback, useEffect, useRef, useState } from 'react'
import { crewLiveService } from '@/features/crew-live/services/crew-live-service'
import type { UseCrewLocationRuntimeReturn } from './useCrewLocationRuntime'
import { useLiveLocationUploader } from './useLiveLocationUploader'
import { useNetworkStatus } from './useNetworkStatus'
import { useSessionPing } from './useSessionPing'
import { getLocationPoint } from '../lib/location-utils'
import {
  clearCrewActiveSessionId,
  writeCrewActiveSessionId,
  saveSessionState,
  clearSessionState,
  addPositionToHistory,
  getPositionHistory,
  getQueuedUpdates,
  clearQueuedUpdates,
} from '../lib/session-storage'
import { isStationary, detectDirectionChange } from '../lib/location-utils'

export interface UseCrewLiveSessionV2Options {
  initialSession: any
  /** The shared location runtime — must be the same instance used by the setup screen. */
  locationRuntime: UseCrewLocationRuntimeReturn
  onSessionUpdate?: (session: any) => void
  onStationaryDetected?: () => void
  onDirectionChangeDetected?: () => void
}

export function useCrewLiveSessionV2(options: UseCrewLiveSessionV2Options) {
  const {
    initialSession,
    locationRuntime,
    onSessionUpdate,
    onStationaryDetected,
    onDirectionChangeDetected,
  } = options

  const [session, setSession] = useState<any>(initialSession)

  // Derive coords shape expected by the rest of the session logic
  const coords = locationRuntime.latestPosition
    ? {
        lat: locationRuntime.latestPosition.lat,
        lng: locationRuntime.latestPosition.lng,
        accuracy: locationRuntime.latestPosition.accuracy,
        heading: locationRuntime.latestPosition.heading,
        speed: locationRuntime.latestPosition.speed,
        timestamp: locationRuntime.latestPosition.capturedAt,
      }
    : null

  // Map runtime readiness to the legacy permissionStatus shape expected by the UI
  const permissionStatus = (() => {
    switch (locationRuntime.readiness) {
      case 'granted': return 'granted' as const
      case 'denied':
      case 'blocked': return 'denied' as const
      case 'unavailable': return 'unsupported' as const
      default: return 'prompt' as const
    }
  })()

  const { status: networkStatus, isOnline } = useNetworkStatus()

  // ── Adaptive location uploader ─────────────────────────────────────────────
  // Handles all location-bearing uploads with adaptive logic.
  // The onUpload callback is isolated behind crewLiveService.pingSession so
  // Unit 03 can swap it to call the Edge Function without touching this hook.

  const {
    uploadStatus,
    clientState,
    lastUploadedAt,
    lastUploadAgeMs,
    hasPendingUpload,
    retryNow: retryLocationUpload,
  } = useLiveLocationUploader({
    sessionId: session?.id ?? null,
    nganyaId: session?.nganya_id ?? null,
    latestPosition: locationRuntime.latestPosition,
    locationReadiness: locationRuntime.readiness,
    isSessionLive: session?.status === 'LIVE',
    onUpload: async ({ sessionId, nganyaId, point, clientState }) => {
      // Call the Edge Function ingestion layer (Unit 03).
      // The service method handles auth, fetch, and error normalisation.
      return crewLiveService.ingestLocation({
        sessionId,
        nganyaId,
        point,
        clientState,
        seatsLeft: session?.seats_left ?? 0,
        direction: session?.direction ?? null,
      })
    },
    onUploadSuccess: (updatedSession) => {
      if (!updatedSession) return
      setSession(updatedSession)
      onSessionUpdate?.(updatedSession)
      clearQueuedUpdates()

      if (updatedSession.status === 'LIVE') {
        saveSessionState({
          sessionId: updatedSession.id,
          nganyaId: updatedSession.nganya_id,
          corridorId: updatedSession.corridor_id,
          direction: updatedSession.direction,
          seatsLeft: updatedSession.seats_left,
          startedAt: updatedSession.started_at,
          lastPingAt: updatedSession.last_ping_at,
          status: updatedSession.status,
        })
      }
    },
    onUploadError: (error) => {
      console.error('[location-uploader] upload failed:', error)
    },
  })

  // ── Seat / direction ping (non-location) ───────────────────────────────────
  // useSessionPing is kept for seat and direction updates only.
  // It no longer drives the location upload loop.
  // pingInterval is set high (60 s) as a safety heartbeat fallback only —
  // the adaptive uploader handles all real location uploads.

  const {
    isPinging,
    lastPingAt,
    lastPingAgeMs,
    queuedUpdates,
    connectionStatus,
    ping,
    retryNow: retryPing,
  } = useSessionPing({
    sessionId: session?.id ?? null,
    isActive: session?.status === 'LIVE',
    pingInterval: 60_000, // safety heartbeat only — adaptive uploader handles location
    onPing: async (payload) => {
      if (!session?.id) throw new Error('No active session')
      const location = coords ? getLocationPoint(coords) : null
      return crewLiveService.pingSession({
        sessionId: session.id,
        seatsLeft: payload.seatsLeft ?? session.seats_left,
        direction: payload.direction ?? session.direction,
        lastLocation: location,
      })
    },
    onSuccess: (updatedSession) => {
      if (!updatedSession) return
      setSession(updatedSession)
      onSessionUpdate?.(updatedSession)
      clearQueuedUpdates()
      if (updatedSession.status === 'LIVE') {
        saveSessionState({
          sessionId: updatedSession.id,
          nganyaId: updatedSession.nganya_id,
          corridorId: updatedSession.corridor_id,
          direction: updatedSession.direction,
          seatsLeft: updatedSession.seats_left,
          startedAt: updatedSession.started_at,
          lastPingAt: updatedSession.last_ping_at,
          status: updatedSession.status,
        })
      }
    },
    onError: (error) => {
      console.error('[session-ping] ping failed:', error)
    },
  })

  // Combined retry: flush both the location uploader and the ping queue
  const retryNow = useCallback(async () => {
    retryLocationUpload()
    await retryPing()
  }, [retryLocationUpload, retryPing])

  // ── Drain persisted queue on mount ─────────────────────────────────────────

  useEffect(() => {
    if (!session?.id || session.status !== 'LIVE') return
    const persisted = getQueuedUpdates()
    const mine = persisted.filter((q: any) => q.sessionId === session.id)
    if (mine.length > 0) {
      void ping(mine[mine.length - 1].payload)
    }
  }, [session?.id])

  // ── Position history for movement detection ────────────────────────────────

  useEffect(() => {
    if (coords && session?.status === 'LIVE') {
      addPositionToHistory({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        heading: coords.heading,
        speed: coords.speed,
        timestamp: coords.timestamp,
      })
    }
  }, [coords, session?.status])

  // ── Stationary detection ───────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.status || session.status !== 'LIVE') return
    const history = getPositionHistory()
    if (history.length >= 3 && isStationary(history, 50)) {
      onStationaryDetected?.()
    }
  }, [coords, session?.status, onStationaryDetected])

  // ── Direction change detection ─────────────────────────────────────────────

  useEffect(() => {
    if (!session?.status || session.status !== 'LIVE') return
    const history = getPositionHistory()
    if (history.length >= 3 && detectDirectionChange(history, 135)) {
      onDirectionChangeDetected?.()
    }
  }, [coords, session?.status, onDirectionChangeDetected])

  // ── Sync session state ─────────────────────────────────────────────────────

  useEffect(() => {
    setSession(initialSession)
  }, [initialSession])

  // ── Write active session ID ────────────────────────────────────────────────

  useEffect(() => {
    if (session?.id && session?.status === 'LIVE') {
      writeCrewActiveSessionId(session.id)
    }
  }, [session?.id, session?.status])

  // ── Location watcher lifecycle ─────────────────────────────────────────────
  // Start watching when session is live and permission is granted.
  // Stop when session ends. Runtime guards against duplicate watchers.

  useEffect(() => {
    if (session?.status === 'LIVE') {
      if (locationRuntime.readiness === 'granted' && !locationRuntime.isWatching) {
        locationRuntime.startWatching()
      }
    } else {
      if (locationRuntime.isWatching) {
        locationRuntime.stopWatching()
      }
    }
  }, [session?.status, locationRuntime.readiness, locationRuntime.isWatching])

  // ── Wake Lock ──────────────────────────────────────────────────────────────

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (session?.status !== 'LIVE' || !('wakeLock' in navigator)) return

    let released = false

    const requestLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      } catch {
        // Wake Lock can fail silently (low battery, unsupported context)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !released && !wakeLockRef.current) {
        void requestLock()
      }
    }

    void requestLock()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [session?.status])

  // ── Actions ────────────────────────────────────────────────────────────────

  const updateSeats = useCallback(
    async (seatsLeft: number) => {
      setSession((current: any) => (current ? { ...current, seats_left: seatsLeft } : current))
      await ping({ seatsLeft })
    },
    [ping],
  )

  const updateDirection = useCallback(
    async (direction: string) => {
      setSession((current: any) => (current ? { ...current, direction } : current))
      await ping({ direction })
    },
    [ping],
  )

  const stopSession = useCallback(async () => {
    if (!session?.id) return
    await crewLiveService.stopSession(session.id)
    clearCrewActiveSessionId()
    clearSessionState()
    locationRuntime.stopWatching()
    setSession((current: any) =>
      current ? { ...current, status: 'OFF', ended_at: new Date().toISOString() } : current,
    )
  }, [session?.id, locationRuntime])

  return {
    session,
    coords,
    permissionStatus,
    networkStatus,
    connectionStatus,
    isTracking: locationRuntime.isWatching,
    isPinging,
    lastPingAt,
    // Expose the uploader's age as the primary "last update" signal for the UI
    lastPingAgeMs: lastUploadAgeMs || lastPingAgeMs,
    queuedUpdates,
    isOnline,
    // Uploader state — available for Unit 06 tracking status UI
    uploadStatus,
    clientState,
    lastUploadedAt,
    hasPendingUpload,
    requestPermission: locationRuntime.requestPermission,
    updateSeats,
    updateDirection,
    stopSession,
    retryNow,
    ping,
  }
}
