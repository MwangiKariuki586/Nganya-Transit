/**
 * useGeolocationStream — Continuous user location stream for the fan tracking overlay.
 *
 * Wraps navigator.geolocation.watchPosition for always-on position updates.
 * Designed specifically for the fan tracking use case:
 *   - Lower accuracy than crew GPS (enableHighAccuracy: false) to preserve battery
 *   - Auto-starts when permission is already granted
 *   - Exposes accuracy (metres) so the UserMarker can size its accuracy ring
 *   - Exposes heading so the UserMarker can show a direction cone
 *   - Cleans up watchId on unmount
 *
 * This is NOT the crew useGeolocation hook. The crew version has start/stop
 * semantics for session management; this one is always-on while the overlay is open.
 *
 * Shared utilities (parsePosition, watchPermission, GeoPermission) live in
 * src/lib/geolocation.ts to avoid duplication with the crew hook.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { parsePosition, watchPermission } from '@/lib/geolocation'
import type { GeoPermission, GeoCoords } from '@/lib/geolocation'

// ─── Types ────────────────────────────────────────────────────────────────────

export type { GeoPermission }

/** Fan-facing coords alias — same shape as GeoCoords, re-exported for consumers. */
export type StreamCoords = GeoCoords

export interface UseGeolocationStreamReturn {
  coords: StreamCoords | null
  permissionStatus: GeoPermission
  error: string | null
  /** Trigger permission prompt. Call when user taps "Enable location". */
  requestPermission: () => void
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Fan tracking watch options — battery-friendly, still responsive */
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 20_000,
  maximumAge: 60_000,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeolocationStream(): UseGeolocationStreamReturn {
  const [coords, setCoords] = useState<StreamCoords | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<GeoPermission>('prompt')
  const [error, setError] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const startWatch = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionStatus('unsupported')
      return
    }
    // Prevent duplicate watches
    if (watchIdRef.current !== null) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionStatus('granted')
        setError(null)
        setCoords(parsePosition(pos))
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setPermissionStatus('denied')
            setError('Location access denied')
            stopWatch()
            break
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable')
            break
          case err.TIMEOUT:
            setError('Location request timed out')
            break
          default:
            setError('Could not get location')
        }
      },
      WATCH_OPTIONS,
    )
  }, [stopWatch])

  // Check existing permission and auto-start if already granted
  useEffect(() => {
    const cleanup = watchPermission((status) => {
      setPermissionStatus(status)
      if (status === 'granted') startWatch()
      if (status === 'denied') stopWatch()
    })
    return cleanup
  }, [startWatch, stopWatch])

  // Cleanup watch on unmount
  useEffect(() => {
    return () => stopWatch()
  }, [stopWatch])

  const requestPermission = useCallback(() => {
    // Calling startWatch will trigger the browser permission prompt on first call
    startWatch()
  }, [startWatch])

  return { coords, permissionStatus, error, requestPermission }
}
