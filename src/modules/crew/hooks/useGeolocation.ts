import { useCallback, useEffect, useRef, useState } from 'react'

export type PermissionStateLocal = 'prompt' | 'granted' | 'denied' | 'unsupported'

export interface Coords {
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watchPosition?: boolean
}

export interface UseGeolocationReturn {
  coords: Coords | null
  permissionStatus: PermissionStateLocal
  isTracking: boolean
  error: string | null
  requestPermission: () => Promise<Coords>
  startTracking: () => void
  stopTracking: () => void
  getCurrentPosition: () => Promise<Coords>
}

const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 3000,
  watchPosition: false,
}

export function useGeolocation(options: GeolocationOptions = {}): UseGeolocationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const [coords, setCoords] = useState<Coords | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStateLocal>('prompt')
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const watchIdRef = useRef<number | null>(null)
  const permissionWatcherRef = useRef<PermissionStatus | null>(null)

  const parsePosition = useCallback((position: GeolocationPosition): Coords => {
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      timestamp: position.timestamp,
    }
  }, [])

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

  const getCurrentPosition = useCallback(async (): Promise<Coords> => {
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported')
      throw new Error('This browser does not support geolocation.')
    }

    return new Promise<Coords>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        setPermissionStatus('prompt')
        reject(new Error('Location request timed out. Please ensure location is enabled and try again.'))
      }, opts.timeout! + 3000)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId)
          const nextCoords = parsePosition(position)
          setCoords(nextCoords)
          setPermissionStatus('granted')
          setError(null)
          resolve(nextCoords)
        },
        (err) => {
          clearTimeout(timeoutId)
          const errorMessage = handleError(err)
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        },
      )
    })
  }, [opts.enableHighAccuracy, opts.timeout, opts.maximumAge, parsePosition, handleError])

  const requestPermission = useCallback(async (): Promise<Coords> => {
    try {
      const position = await getCurrentPosition()
      return position
    } catch (err: any) {
      throw err
    }
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
  }, [opts.enableHighAccuracy, opts.timeout, opts.maximumAge, parsePosition, handleError])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }, [])

  // Monitor permission status
  useEffect(() => {
    if (typeof navigator === 'undefined') return

    if (!navigator.geolocation) {
      setPermissionStatus('unsupported')
      return
    }

    if (!('permissions' in navigator) || !navigator.permissions?.query) {
      setPermissionStatus('prompt')
      return
    }

    let active = true

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!active) return

        permissionWatcherRef.current = status
        const nextStatus =
          status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt'

        setPermissionStatus(nextStatus)

        // If permission already granted and watchPosition enabled, start immediately
        if (nextStatus === 'granted' && opts.watchPosition) {
          // Small delay to ensure state is updated
          setTimeout(() => {
            if (active && watchIdRef.current === null) {
              startTracking()
            }
          }, 100)
        }

        status.onchange = () => {
          const updatedStatus =
            status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt'
          setPermissionStatus(updatedStatus)
        }
      })
      .catch(() => {
        setPermissionStatus('prompt')
      })

    return () => {
      active = false
      if (permissionWatcherRef.current) {
        permissionWatcherRef.current.onchange = null
      }
    }
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
