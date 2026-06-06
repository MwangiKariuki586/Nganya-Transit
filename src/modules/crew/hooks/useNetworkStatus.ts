import { useEffect, useState } from 'react'

export type NetworkStateLocal = 'healthy' | 'poor' | 'offline'

export interface NetworkStatusReturn {
  status: NetworkStateLocal
  isOnline: boolean
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
}

export function useNetworkStatus(): NetworkStatusReturn {
  const [status, setStatus] = useState<NetworkStateLocal>(
    typeof navigator === 'undefined' || navigator.onLine ? 'healthy' : 'offline',
  )
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [effectiveType, setEffectiveType] = useState<string | null>(null)
  const [downlink, setDownlink] = useState<number | null>(null)
  const [rtt, setRtt] = useState<number | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

      if (connection) {
        setEffectiveType(connection.effectiveType || null)
        setDownlink(connection.downlink || null)
        setRtt(connection.rtt || null)

        // Determine status based on connection quality
        if (!navigator.onLine) {
          setStatus('offline')
        } else if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          setStatus('poor')
        } else if (connection.rtt > 500 || connection.downlink < 0.5) {
          setStatus('poor')
        } else {
          setStatus('healthy')
        }
      } else {
        // Fallback if Network Information API not available
        setStatus(navigator.onLine ? 'healthy' : 'offline')
      }
    }

    const handleOnline = () => {
      setIsOnline(true)
      updateConnectionInfo()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setStatus('offline')
    }

    const handleConnectionChange = () => {
      updateConnectionInfo()
    }

    // Initial update
    updateConnectionInfo()

    // Listen to online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen to connection changes
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      connection.addEventListener('change', handleConnectionChange)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])

  return {
    status,
    isOnline,
    effectiveType,
    downlink,
    rtt,
  }
}
