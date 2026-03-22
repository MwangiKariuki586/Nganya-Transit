import { useCallback, useEffect, useRef, useState } from 'react'
import { crewLiveService } from '@/features/crew-live/services/crew-live-service'
import {
  clearCrewActiveSessionId,
  writeCrewActiveSessionId,
} from '@/modules/crew/lib/storage'

const PING_INTERVAL_MS = 15000
const MAX_RETRY_MS = 60000
const POOR_CONNECTION_MS = 60000
const STALE_CONNECTION_MS = 90000

type PermissionStateLocal = 'prompt' | 'granted' | 'denied' | 'unsupported'
type ConnectionStateLocal = 'healthy' | 'poor' | 'retrying' | 'offline'

function getLocationPoint(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(`POINT(${position.coords.longitude} ${position.coords.latitude})`)
      },
      () => reject(new Error('Allow location access to keep this live session active.')),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    )
  })
}

export function useCrewLiveSession(initialSession: any) {
  const [session, setSession] = useState<any>(initialSession)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStateLocal>(
    typeof navigator === 'undefined'
      ? 'prompt'
      : navigator.geolocation
        ? 'prompt'
        : 'unsupported',
  )
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStateLocal>('healthy')
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isPinging, setIsPinging] = useState(false)
  const [lastPingAgeMs, setLastPingAgeMs] = useState(0)

  const queuedPayloadRef = useRef<{ seatsLeft: number, direction?: string | null, lastLocation?: string | null } | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(PING_INTERVAL_MS)

  useEffect(() => {
    setSession(initialSession)
  }, [initialSession])

  useEffect(() => {
    if (session?.id) {
      writeCrewActiveSessionId(session.id)
    }
  }, [session?.id])

  useEffect(() => {
    if (!session?.last_ping_at || session?.status !== 'LIVE') {
      setLastPingAgeMs(0)
      return
    }

    const updateHealth = () => {
      const age = Date.now() - new Date(session.last_ping_at).getTime()
      setLastPingAgeMs(age)

      if (!navigator.onLine) {
        setConnectionStatus('offline')
        setConnectionMessage('Network connection dropped. The last update will retry when you are back online.')
        return
      }

      if (age > STALE_CONNECTION_MS) {
        setConnectionStatus((current) => (current === 'retrying' ? current : 'poor'))
        setConnectionMessage('Last live update is stale. Keep this screen open while the retry loop catches up.')
        return
      }

      if (age > POOR_CONNECTION_MS) {
        setConnectionStatus((current) => (current === 'retrying' ? current : 'poor'))
        setConnectionMessage('Live updates are lagging. Signal looks weak.')
        return
      }

      setConnectionStatus((current) => (current === 'retrying' || current === 'offline' ? current : 'healthy'))
      if (connectionStatus === 'poor') {
        setConnectionMessage(null)
      }
    }

    updateHealth()
    const intervalId = setInterval(updateHealth, 5000)
    return () => clearInterval(intervalId)
  }, [connectionStatus, session?.last_ping_at, session?.status])

  const requestPermission = useCallback(async () => {
    try {
      const point = await getLocationPoint()
      setPermissionStatus('granted')
      return point
    } catch (error: any) {
      setPermissionStatus(error?.message?.includes('not available') ? 'unsupported' : 'denied')
      throw error
    }
  }, [])

  const runPing = useCallback(async (overrides?: { seatsLeft?: number, direction?: string | null, lastLocation?: string | null }) => {
    if (!session?.id || session?.status !== 'LIVE') return null

    setIsPinging(true)

    const seatsLeft = overrides?.seatsLeft ?? session.seats_left
    const direction = overrides?.direction ?? session.direction

    try {
      const lastLocation = overrides?.lastLocation ?? (await requestPermission())
      const updatedSession = await crewLiveService.pingSession({
        sessionId: session.id,
        seatsLeft,
        direction,
        lastLocation,
      })

      setSession(updatedSession)
      setConnectionStatus('healthy')
      setConnectionMessage(null)
      setLastError(null)
      retryDelayRef.current = PING_INTERVAL_MS
      queuedPayloadRef.current = null
      return updatedSession
    } catch (error: any) {
      const message = error?.message || 'Live update failed.'
      setLastError(message)
      setConnectionStatus(navigator.onLine ? 'retrying' : 'offline')
      setConnectionMessage(message)
      queuedPayloadRef.current = {
        seatsLeft,
        direction,
        lastLocation: overrides?.lastLocation ?? null,
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }

      const retryDelay = retryDelayRef.current
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_MS)
      retryTimeoutRef.current = setTimeout(() => {
        if (queuedPayloadRef.current) {
          void runPing(queuedPayloadRef.current)
        }
      }, retryDelay)

      return null
    } finally {
      setIsPinging(false)
    }
  }, [requestPermission, session])

  useEffect(() => {
    if (!session?.id || session?.status !== 'LIVE') return

    const intervalId = setInterval(() => {
      void runPing()
    }, PING_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [runPing, session?.id, session?.status])

  useEffect(() => {
    const handleOnline = () => {
      if (queuedPayloadRef.current) {
        void runPing(queuedPayloadRef.current)
        return
      }

      setConnectionStatus('healthy')
      setConnectionMessage(null)
    }

    const handleOffline = () => {
      setConnectionStatus('offline')
      setConnectionMessage('Network connection dropped. The last update will retry when you are back online.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [runPing])

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  const updateSeats = useCallback(async (seatsLeft: number) => {
    setSession((current: any) => current ? { ...current, seats_left: seatsLeft } : current)
    await runPing({ seatsLeft, lastLocation: null })
  }, [runPing])

  const updateDirection = useCallback(async (direction: string) => {
    setSession((current: any) => current ? { ...current, direction } : current)
    await runPing({ direction, lastLocation: null })
  }, [runPing])

  const stopSession = useCallback(async () => {
    if (!session?.id) return
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    queuedPayloadRef.current = null
    await crewLiveService.stopSession(session.id)
    clearCrewActiveSessionId()
    setSession((current: any) => current ? {
      ...current,
      status: 'OFF',
      ended_at: new Date().toISOString(),
    } : current)
  }, [session?.id])

  const retryNow = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    await runPing(queuedPayloadRef.current || undefined)
  }, [runPing])

  return {
    session,
    permissionStatus,
    connectionStatus,
    connectionMessage,
    lastPingAgeMs,
    lastError,
    isPinging,
    requestPermission,
    updateSeats,
    updateDirection,
    stopSession,
    retryNow,
    runPing,
  }
}
