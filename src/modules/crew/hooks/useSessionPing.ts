import { useCallback, useEffect, useRef, useState } from 'react'

export interface PingPayload {
  seatsLeft?: number
  direction?: string | null
  lastLocation?: string | null
}

export interface QueuedUpdate extends PingPayload {
  timestamp: number
  retryCount: number
}

export interface UseSessionPingOptions {
  sessionId: string | null
  isActive: boolean
  pingInterval?: number
  maxRetryDelay?: number
  onPing: (payload: PingPayload) => Promise<any>
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
}

export interface UseSessionPingReturn {
  isPinging: boolean
  lastPingAt: number | null
  lastPingAgeMs: number
  queuedUpdates: QueuedUpdate[]
  connectionStatus: 'healthy' | 'poor' | 'retrying' | 'offline'
  ping: (payload?: PingPayload) => Promise<void>
  retryNow: () => Promise<void>
  clearQueue: () => void
}

const DEFAULT_PING_INTERVAL = 15000
const MAX_RETRY_DELAY = 60000
const POOR_CONNECTION_THRESHOLD = 60000
const STALE_CONNECTION_THRESHOLD = 90000

export function useSessionPing(options: UseSessionPingOptions): UseSessionPingReturn {
  const {
    sessionId,
    isActive,
    pingInterval = DEFAULT_PING_INTERVAL,
    maxRetryDelay = MAX_RETRY_DELAY,
    onPing,
    onSuccess,
    onError,
  } = options

  const [isPinging, setIsPinging] = useState(false)
  const [lastPingAt, setLastPingAt] = useState<number | null>(null)
  const [lastPingAgeMs, setLastPingAgeMs] = useState(0)
  const [queuedUpdates, setQueuedUpdates] = useState<QueuedUpdate[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'healthy' | 'poor' | 'retrying' | 'offline'>('healthy')

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(pingInterval)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queuedUpdatesRef = useRef<QueuedUpdate[]>([])

  // Monitor ping age and update connection status
  useEffect(() => {
    if (!lastPingAt || !isActive) {
      setLastPingAgeMs(0)
      return
    }

    const updateHealth = () => {
      const age = Date.now() - lastPingAt
      setLastPingAgeMs(age)

      if (!navigator.onLine) {
        setConnectionStatus('offline')
        return
      }

      if (age > STALE_CONNECTION_THRESHOLD) {
        setConnectionStatus((current) => (current === 'retrying' ? current : 'poor'))
        return
      }

      if (age > POOR_CONNECTION_THRESHOLD) {
        setConnectionStatus((current) => (current === 'retrying' ? current : 'poor'))
        return
      }

      setConnectionStatus((current) => (current === 'retrying' || current === 'offline' ? current : 'healthy'))
    }

    updateHealth()
    const intervalId = setInterval(updateHealth, 5000)
    return () => clearInterval(intervalId)
  }, [lastPingAt, isActive])

  const ping = useCallback(
    async (payload?: PingPayload) => {
      if (!sessionId || !isActive) return

      setIsPinging(true)

      try {
        const result = await onPing(payload || {})
        
        setLastPingAt(Date.now())
        setConnectionStatus('healthy')
        retryDelayRef.current = pingInterval
        
        // Clear queue on success
        queuedUpdatesRef.current = []
        setQueuedUpdates([])
        
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }

        onSuccess?.(result)
      } catch (error: any) {
        setConnectionStatus(navigator.onLine ? 'retrying' : 'offline')
        
        // Queue the failed update
        const queuedUpdate: QueuedUpdate = {
          ...payload,
          timestamp: Date.now(),
          retryCount: 0,
        }
        
        // Latest-only queue: retry the freshest update, not a stale closure.
        queuedUpdatesRef.current = [queuedUpdate]
        setQueuedUpdates([queuedUpdate])

        onError?.(error)

        // Schedule retry with exponential backoff
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
        }

        const retryDelay = retryDelayRef.current
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, maxRetryDelay)
        
        retryTimeoutRef.current = setTimeout(() => {
          const latest = queuedUpdatesRef.current[0]
          if (latest) void ping(latest)
        }, retryDelay)
      } finally {
        setIsPinging(false)
      }
    },
    [sessionId, isActive, onPing, onSuccess, onError, pingInterval, maxRetryDelay],
  )

  const retryNow = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    const latest = queuedUpdatesRef.current[0]
    if (latest) {
      await ping(latest)
    } else {
      await ping()
    }
  }, [ping])

  const clearQueue = useCallback(() => {
    queuedUpdatesRef.current = []
    setQueuedUpdates([])
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  // Auto-ping interval
  useEffect(() => {
    if (!sessionId || !isActive) return

    intervalRef.current = setInterval(() => {
      void ping()
    }, pingInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sessionId, isActive, pingInterval, ping])

  // Catch-up ping when tab becomes visible after being backgrounded
  useEffect(() => {
    if (!sessionId || !isActive) return

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void ping()

        // Reset the interval so the next tick is a full pingInterval away
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        intervalRef.current = setInterval(() => {
          void ping()
        }, pingInterval)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [sessionId, isActive, ping, pingInterval])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (queuedUpdatesRef.current.length > 0) {
        void retryNow()
      } else {
        setConnectionStatus('healthy')
      }
    }

    const handleOffline = () => {
      setConnectionStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [queuedUpdates, retryNow])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isPinging,
    lastPingAt,
    lastPingAgeMs,
    queuedUpdates,
    connectionStatus,
    ping,
    retryNow,
    clearQueue,
  }
}
