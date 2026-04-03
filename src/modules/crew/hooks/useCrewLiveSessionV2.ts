import { useCallback, useEffect, useState } from 'react'
import { crewLiveService } from '@/features/crew-live/services/crew-live-service'
import { useGeolocation } from './useGeolocation'
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
} from '../lib/session-storage'
import { isStationary, detectDirectionChange } from '../lib/location-utils'

export interface UseCrewLiveSessionV2Options {
  initialSession: any
  onSessionUpdate?: (session: any) => void
  onStationaryDetected?: () => void
  onDirectionChangeDetected?: () => void
}

export function useCrewLiveSessionV2(options: UseCrewLiveSessionV2Options) {
  const { initialSession, onSessionUpdate, onStationaryDetected, onDirectionChangeDetected } = options

  const [session, setSession] = useState<any>(initialSession)

  // Use new modular hooks
  const {
    coords,
    permissionStatus,
    isTracking,
    requestPermission,
    startTracking,
    stopTracking,
  } = useGeolocation({ watchPosition: true })

  const { status: networkStatus, isOnline } = useNetworkStatus()

  const {
    isPinging,
    lastPingAt,
    lastPingAgeMs,
    queuedUpdates,
    connectionStatus,
    ping,
    retryNow,
  } = useSessionPing({
    sessionId: session?.id,
    isActive: session?.status === 'LIVE',
    onPing: async (payload) => {
      if (!session?.id) throw new Error('No active session')

      const location = coords ? getLocationPoint(coords) : null

      const result = await crewLiveService.pingSession({
        sessionId: session.id,
        seatsLeft: payload.seatsLeft ?? session.seats_left,
        direction: payload.direction ?? session.direction,
        lastLocation: location,
      })

      return result
    },
    onSuccess: (updatedSession) => {
      setSession(updatedSession)
      onSessionUpdate?.(updatedSession)

      // Save session state for recovery
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
      console.error('Ping failed:', error)
    },
  })

  // Track position history for movement detection
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

  // Detect stationary vehicle
  useEffect(() => {
    if (!session?.status || session.status !== 'LIVE') return

    const history = getPositionHistory()
    if (history.length >= 3 && isStationary(history, 50)) {
      onStationaryDetected?.()
    }
  }, [coords, session?.status, onStationaryDetected])

  // Detect direction changes (U-turns)
  useEffect(() => {
    if (!session?.status || session.status !== 'LIVE') return

    const history = getPositionHistory()
    if (history.length >= 3 && detectDirectionChange(history, 135)) {
      onDirectionChangeDetected?.()
    }
  }, [coords, session?.status, onDirectionChangeDetected])

  // Sync session state
  useEffect(() => {
    setSession(initialSession)
  }, [initialSession])

  // Write active session ID
  useEffect(() => {
    if (session?.id && session?.status === 'LIVE') {
      writeCrewActiveSessionId(session.id)
    }
  }, [session?.id, session?.status])

  // Start tracking when session is live and permission is granted
  useEffect(() => {
    if (session?.status === 'LIVE') {
      if (permissionStatus === 'granted' && !isTracking) {
        startTracking()
      }
      // Don't stop tracking if permission is still granted, even if session changes
    } else {
      // Only stop tracking if session is not live
      if (isTracking) {
        stopTracking()
      }
    }
  }, [session?.status, permissionStatus, isTracking, startTracking, stopTracking])

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
    stopTracking()

    setSession((current: any) =>
      current
        ? {
            ...current,
            status: 'OFF',
            ended_at: new Date().toISOString(),
          }
        : current,
    )
  }, [session?.id, stopTracking])

  return {
    session,
    coords,
    permissionStatus,
    networkStatus,
    connectionStatus,
    isTracking,
    isPinging,
    lastPingAt,
    lastPingAgeMs,
    queuedUpdates,
    isOnline,
    requestPermission,
    updateSeats,
    updateDirection,
    stopSession,
    retryNow,
    ping,
  }
}
