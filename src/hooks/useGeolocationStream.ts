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
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeoPermission = 'prompt' | 'granted' | 'denied' | 'unsupported'

export interface StreamCoords {
  lat: number
  lng: number
  /** Accuracy radius in metres. null if device doesn't report it. */
  accuracy: number | null
  /** Direction of travel in degrees [0-360). null if not moving or unavailable. */
  heading: number | null
  /** Speed in m/s. null if unavailable. */
  speed: number | null
}

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
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          heading: Number.isFinite(pos.coords.heading ?? NaN) ? pos.coords.heading : null,
          speed: Number.isFinite(pos.coords.speed ?? NaN) ? pos.coords.speed : null,
        })
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
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionStatus('unsupported')
      return
    }

    if (!navigator.permissions?.query) {
      // Browser doesn't support permissions API — defer until requestPermission is called
      return
    }

    let active = true

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!active) return

        const mapped: GeoPermission =
          status.state === 'granted'
            ? 'granted'
            : status.state === 'denied'
              ? 'denied'
              : 'prompt'

        setPermissionStatus(mapped)
        if (mapped === 'granted') startWatch()

        // React to permission changes in-session
        status.onchange = () => {
          const updated: GeoPermission =
            status.state === 'granted'
              ? 'granted'
              : status.state === 'denied'
                ? 'denied'
                : 'prompt'
          setPermissionStatus(updated)
          if (updated === 'granted') startWatch()
          if (updated === 'denied') stopWatch()
        }
      })
      .catch(() => {
        // Permissions API failed — leave at 'prompt', user must trigger manually
        setPermissionStatus('prompt')
      })

    return () => {
      active = false
    }
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
