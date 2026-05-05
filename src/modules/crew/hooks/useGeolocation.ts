import { useCallback, useEffect, useRef, useState } from 'react'
import { parsePosition, watchPermission } from '@/lib/geolocation'
import type { GeoPermission, GeoCoords } from '@/lib/geolocation'

export type PermissionStateLocal = GeoPermission

export type { GeoCoords as Coords }

export interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watchPosition?: boolean
}

export interface UseGeolocationReturn {
  coords: GeoCoords | null
  permissionStatus: PermissionStateLocal
  isTracking: boolean
  error: string | null
  requestPermission: () => Promise<GeoCoords>
  startTracking: () => void
  stopTracking: () => void
  getCurrentPosition: () => Promise<GeoCoords>
}

const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 30000,
  watchPosition: false,
}

export function useGeolocation(options: GeolocationOptions = {}): UseGeolocationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const [coords, setCoords] = useState<GeoCoords | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStateLocal>('prompt')
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)

  const handleError = useCallback((err: GeolocationPositionError): string => {
    let errorMessage = 'Location permission is required.'

    switch (err.code) {
      case err.PERMISSION_DENIED:
        setPermissionStatus('denied')
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          errorMessage = 'Location requires a secure connection. Please use HTTPS or localhost.'
        } else {
          errorMessage = 'Location permission denied. Please enable location in your settings.'
        }
        break
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Location information is unavailable. Please check your device location services.'
        break
      case err.TIMEOUT:
        setPermissionStatus('prompt')
        errorMessage = 'Location request timed out. Please ensure location is enabled and try again.'
        break
      default:
        setPermissionStatus('prompt')
        errorMessage = 'An unknown error occurred while getting location.'
        break
    }

    setError(errorMessage)
    return errorMessage
  }, [])

  const getCurrentPosition = useCallback(async (): Promise<GeoCoords> => {
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported')
      throw new Error('This browser does not support geolocation.')
    }

    const tryGet = (highAccuracy: boolean, timeout: number, maximumAge: number) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge,
        })
      })

    try {
      // Fast path: accept any network/wifi/cached position (almost instant)
      const position = await tryGet(false, 5000, 60000)
      const nextCoords = parsePosition(position)
      setCoords(nextCoords)
      setPermissionStatus('granted')
      setError(null)
      return nextCoords
    } catch (fastErr: any) {
      // Permission denied — no point retrying with high accuracy
      if (fastErr?.code === 1) {
        const errorMessage = handleError(fastErr)
        throw new Error(errorMessage)
      }
      // TIMEOUT or POSITION_UNAVAILABLE — fall back to high-accuracy GPS
      try {
        const position = await tryGet(true, opts.timeout!, opts.maximumAge!)
        const nextCoords = parsePosition(position)
        setCoords(nextCoords)
        setPermissionStatus('granted')
        setError(null)
        return nextCoords
      } catch (slowErr: any) {
        const errorMessage = handleError(slowErr)
        throw new Error(errorMessage)
      }
    }
  }, [opts.timeout, opts.maximumAge, handleError])

  const requestPermission = useCallback(async (): Promise<GeoCoords> => {
    return getCurrentPosition()
  }, [getCurrentPosition])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported')
      return
    }

    if (watchIdRef.current !== null) {
      return // Already tracking
    }

    setIsTracking(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextCoords = parsePosition(position)
        setCoords(nextCoords)
        setPermissionStatus('granted')
        setError(null)
      },
      (err) => {
        handleError(err)
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      },
    )
  }, [opts.enableHighAccuracy, opts.timeout, opts.maximumAge, handleError])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }, [])

  // Monitor permission status via shared utility
  useEffect(() => {
    const cleanup = watchPermission((status) => {
      setPermissionStatus(status)

      // If permission already granted and watchPosition enabled, start immediately
      if (status === 'granted' && opts.watchPosition && watchIdRef.current === null) {
        setTimeout(() => {
          if (watchIdRef.current === null) startTracking()
        }, 100)
      }
    })
    return cleanup
  }, [opts.watchPosition, startTracking])

  // Auto-start tracking if option enabled and permission granted
  useEffect(() => {
    if (opts.watchPosition && permissionStatus === 'granted' && !isTracking) {
      startTracking()
    }

    return () => {
      if (opts.watchPosition) {
        stopTracking()
      }
    }
  }, [opts.watchPosition, permissionStatus, isTracking, startTracking, stopTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    coords,
    permissionStatus,
    isTracking,
    error,
    requestPermission,
    startTracking,
    stopTracking,
    getCurrentPosition,
  }
}
