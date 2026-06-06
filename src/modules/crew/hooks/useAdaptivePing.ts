import { useEffect, useState, useCallback, useRef } from 'react'
import { calculateSpeed, isStationary } from '../lib/location-utils'
import type { Coords } from './useGeolocation'
import { getPositionHistory } from '../lib/session-storage'

export type PingMode = 'fast' | 'normal' | 'slow' | 'stationary'

export interface UseAdaptivePingOptions {
  currentPosition: Coords | null
  isActive: boolean
  baseInterval?: number
  onIntervalChange?: (interval: number, mode: PingMode) => void
}

export interface UseAdaptivePingReturn {
  currentInterval: number
  currentMode: PingMode
  speed: number | null
  isMoving: boolean
  batteryLevel: number | null
}

const INTERVALS = {
  fast: 5000, // 5s - moving fast or seats changing
  normal: 15000, // 15s - normal operation
  slow: 30000, // 30s - slow movement
  stationary: 60000, // 60s - not moving
}

const SPEED_THRESHOLDS = {
  fast: 40, // km/h - highway speed
  normal: 15, // km/h - city speed
  slow: 5, // km/h - crawling
}

export function useAdaptivePing(options: UseAdaptivePingOptions): UseAdaptivePingReturn {
  const { currentPosition, isActive, baseInterval = INTERVALS.normal, onIntervalChange } = options

  const [currentInterval, setCurrentInterval] = useState(baseInterval)
  const [currentMode, setCurrentMode] = useState<PingMode>('normal')
  const [speed, setSpeed] = useState<number | null>(null)
  const [isMoving, setIsMoving] = useState(true)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [lastSeatChange, setLastSeatChange] = useState<number>(0)

  const previousPositionRef = useRef<Coords | null>(null)

  // Monitor battery level
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return

    let active = true

    ;(navigator as any).getBattery().then((battery: any) => {
      if (!active) return

      const updateBattery = () => {
        if (active) {
          setBatteryLevel(battery.level * 100)
        }
      }

      updateBattery()
      battery.addEventListener('levelchange', updateBattery)

      return () => {
        battery.removeEventListener('levelchange', updateBattery)
      }
    })

    return () => {
      active = false
    }
  }, [])

  // Calculate speed and determine mode
  useEffect(() => {
    if (!isActive || !currentPosition) return

    const history = getPositionHistory()

    // Calculate speed if we have previous position
    if (previousPositionRef.current) {
      const calculatedSpeed = calculateSpeed(previousPositionRef.current, currentPosition)
      setSpeed(calculatedSpeed)
    }

    previousPositionRef.current = currentPosition

    // Check if stationary
    const stationary = history.length >= 3 && isStationary(history, 50)
    setIsMoving(!stationary)

    // Determine mode based on speed and movement
    let newMode: PingMode = 'normal'
    let newInterval = INTERVALS.normal

    if (stationary) {
      newMode = 'stationary'
      newInterval = INTERVALS.stationary
    } else if (speed !== null) {
      if (speed > SPEED_THRESHOLDS.fast) {
        newMode = 'fast'
        newInterval = INTERVALS.fast
      } else if (speed > SPEED_THRESHOLDS.normal) {
        newMode = 'normal'
        newInterval = INTERVALS.normal
      } else if (speed > SPEED_THRESHOLDS.slow) {
        newMode = 'slow'
        newInterval = INTERVALS.slow
      } else {
        newMode = 'slow'
        newInterval = INTERVALS.slow
      }
    }

    // If seats changed recently, use fast mode
    const timeSinceLastSeatChange = Date.now() - lastSeatChange
    if (timeSinceLastSeatChange < 60000) {
      // Within 1 minute of seat change
      newMode = 'fast'
      newInterval = INTERVALS.fast
    }

    // Battery-aware throttling
    if (batteryLevel !== null && batteryLevel < 20) {
      // Low battery - increase interval
      newInterval = Math.min(newInterval * 2, INTERVALS.stationary)
    }

    // Update if changed
    if (newMode !== currentMode || newInterval !== currentInterval) {
      setCurrentMode(newMode)
      setCurrentInterval(newInterval)
      onIntervalChange?.(newInterval, newMode)
    }
  }, [
    currentPosition,
    isActive,
    speed,
    currentMode,
    currentInterval,
    lastSeatChange,
    batteryLevel,
    onIntervalChange,
  ])

  const notifySeatChange = useCallback(() => {
    setLastSeatChange(Date.now())
  }, [])

  return {
    currentInterval,
    currentMode,
    speed,
    isMoving,
    batteryLevel,
  }
}
