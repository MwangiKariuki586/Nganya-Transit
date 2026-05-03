/**
 * useCrewLocationRuntime — Single owner of the crew browser location watcher.
 *
 * This is the canonical location runtime for all crew live tracking flows.
 * It must be instantiated ONCE per crew session context and shared downward.
 *
 * Responsibilities:
 *   - Check geolocation permission state via the Permissions API (no prompt)
 *   - Request permission only when the crew explicitly triggers it
 *   - Own the single active watchPosition watcher while live
 *   - Expose readiness state, latest position, accuracy, and error
 *   - React to permission changes without requiring a page reload
 *
 * Readiness states:
 *   checking         → Permissions API query in flight
 *   prompt_required  → Permission not yet granted; user must be asked
 *   granted          → Permission granted; location available
 *   denied           → Permission denied by user
 *   blocked          → Permission denied and cannot be re-prompted (same as denied
 *                      but surfaced separately so UI can show settings guidance)
 *   unavailable      → Browser does not support geolocation
 *
 * Rules:
 *   - Never creates more than one watchPosition at a time
 *   - startWatching() is a no-op if a watcher is already active
 *   - stopWatching() clears the watcher and resets isWatching
 *   - requestPermission() calls getCurrentPosition to trigger the browser prompt
 *     and resolves with the first fix, or rejects with a human-readable error
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LocationReadiness =
  | 'checking'
  | 'prompt_required'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable'

export interface CrewLocationPosition {
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  /** ms since epoch — from GeolocationPosition.timestamp */
  capturedAt: number
}

export interface UseCrewLocationRuntimeReturn {
  /** Current readiness state */
  readiness: LocationReadiness
  /** Latest known position from the watcher or a one-shot fix */
  latestPosition: CrewLocationPosition | null
  /** Accuracy of the latest position in metres (null if unavailable) */
  accuracy: number | null
  /** Human-readable error message, or null */
  error: string | null
  /** Whether a watchPosition watcher is currently active */
  isWatching: boolean
  /**
   * Trigger the browser permission prompt and resolve with the first fix.
   * Safe to call when readiness is already 'granted' — will just return a fresh fix.
   * Rejects with a human-readable Error on denial or timeout.
   */
  requestPermission: () => Promise<CrewLocationPosition>
  /**
   * Start the watchPosition watcher.
   * No-op if already watching or if readiness is not 'granted'.
   * Call after requestPermission() resolves, or when readiness is already 'granted'.
   */
  startWatching: () => void
  /**
   * Stop the watchPosition watcher and clear the watch ID.
   * Call when the live session ends.
   */
  stopWatching: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 10_000,
}

const FAST_GET_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 5_000,
  maximumAge: 60_000,
}

const ACCURATE_GET_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 30_000,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCrewLocationRuntime(): UseCrewLocationRuntimeReturn {
  const [readiness, setReadiness] = useState<LocationReadiness>('checking')
  const [latestPosition, setLatestPosition] = useState<CrewLocationPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWatching, setIsWatching] = useState(false)

  const watchIdRef = useRef<number | null>(null)
  const permissionStatusRef = useRef<PermissionStatus | null>(null)
  // Prevent double-init in StrictMode
  const initDoneRef = useRef(false)

  // ── Position parser ────────────────────────────────────────────────────────

  const parsePosition = useCallback((pos: GeolocationPosition): CrewLocationPosition => ({
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
    heading: pos.coords.heading ?? null,
    speed: pos.coords.speed ?? null,
    capturedAt: pos.timestamp,
  }), [])

  // ── Error classifier ───────────────────────────────────────────────────────

  const classifyError = useCallback((err: GeolocationPositionError): {
    readiness: LocationReadiness
    message: string
  } => {
    switch (err.code) {
      case err.PERMISSION_DENIED: {
        const isInsecure =
          typeof window !== 'undefined' && window.isSecureContext === false
        return {
          readiness: 'blocked',
          message: isInsecure
            ? 'Location requires a secure connection (HTTPS).'
            : 'Location permission denied. Open your browser settings to re-enable it.',
        }
      }
      case err.POSITION_UNAVAILABLE:
        return {
          readiness: 'granted', // permission is fine; hardware/signal issue
          message: 'Location unavailable. Check your device location services.',
        }
      case err.TIMEOUT:
        return {
          readiness: 'granted',
          message: 'Location timed out. Ensure GPS is enabled and try again.',
        }
      default:
        return {
          readiness: 'granted',
          message: 'An unknown location error occurred.',
        }
    }
  }, [])

  // ── Permissions API check (no prompt) ─────────────────────────────────────

  useEffect(() => {
    if (initDoneRef.current) return
    initDoneRef.current = true

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setReadiness('unavailable')
      return
    }

    if (!('permissions' in navigator) || !navigator.permissions?.query) {
      // Permissions API not available — assume prompt_required
      setReadiness('prompt_required')
      return
    }

    let active = true

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!active) return

        permissionStatusRef.current = status

        const next = mapPermissionState(status.state)
        setReadiness(next)

        // React to future permission changes (e.g. user revokes in settings)
        status.onchange = () => {
          const updated = mapPermissionState(status.state)
          setReadiness(updated)
          // If permission was revoked while watching, stop the watcher
          if (updated === 'denied' || updated === 'blocked') {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current)
              watchIdRef.current = null
              setIsWatching(false)
            }
          }
        }
      })
      .catch(() => {
        if (active) setReadiness('prompt_required')
      })

    return () => {
      active = false
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── requestPermission ──────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<CrewLocationPosition> => {
    if (!navigator.geolocation) {
      setReadiness('unavailable')
      throw new Error('This browser does not support geolocation.')
    }

    const tryGet = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts)
      })

    try {
      // Fast path: accept any cached/network fix first (nearly instant)
      const pos = await tryGet(FAST_GET_OPTIONS)
      const parsed = parsePosition(pos)
      setLatestPosition(parsed)
      setReadiness('granted')
      setError(null)
      return parsed
    } catch (fastErr: any) {
      // PERMISSION_DENIED — no point retrying with high accuracy
      if (fastErr?.code === 1) {
        const { readiness: r, message } = classifyError(fastErr)
        setReadiness(r)
        setError(message)
        throw new Error(message)
      }
      // TIMEOUT or POSITION_UNAVAILABLE — retry with high-accuracy GPS
      try {
        const pos = await tryGet(ACCURATE_GET_OPTIONS)
        const parsed = parsePosition(pos)
        setLatestPosition(parsed)
        setReadiness('granted')
        setError(null)
        return parsed
      } catch (slowErr: any) {
        const { readiness: r, message } = classifyError(slowErr)
        setReadiness(r)
        setError(message)
        throw new Error(message)
      }
    }
  }, [parsePosition, classifyError])

  // ── startWatching ──────────────────────────────────────────────────────────

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setReadiness('unavailable')
      return
    }

    // Guard: only one watcher at a time
    if (watchIdRef.current !== null) return

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const parsed = parsePosition(pos)
        setLatestPosition(parsed)
        setReadiness('granted')
        setError(null)
      },
      (err) => {
        const { readiness: r, message } = classifyError(err)
        setReadiness(r)
        setError(message)
        // On permission denial, clear the watch
        if (err.code === err.PERMISSION_DENIED) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
            setIsWatching(false)
          }
        }
      },
      WATCH_OPTIONS,
    )

    watchIdRef.current = id
    setIsWatching(true)
  }, [parsePosition, classifyError])

  // ── stopWatching ───────────────────────────────────────────────────────────

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsWatching(false)
  }, [])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null
      }
    }
  }, [])

  return {
    readiness,
    latestPosition,
    accuracy: latestPosition?.accuracy ?? null,
    error,
    isWatching,
    requestPermission,
    startWatching,
    stopWatching,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapPermissionState(state: PermissionState): LocationReadiness {
  switch (state) {
    case 'granted':
      return 'granted'
    case 'denied':
      return 'blocked'
    default:
      return 'prompt_required'
  }
}
