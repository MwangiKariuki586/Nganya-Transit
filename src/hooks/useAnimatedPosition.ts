/**
 * useAnimatedPosition — rAF-based smooth position interpolation for map markers.
 *
 * Takes a discrete TrackingPosition (changes on each Realtime event) and outputs
 * a continuously-updating animated position + compass heading so map markers
 * glide smoothly rather than teleporting.
 *
 * Algorithm:
 *   - On each new position, record startPos, endPos, startTime
 *   - Each rAF frame: t = elapsed / duration, apply ease-in-out cubic, lerp lat/lng
 *   - Heading is computed once from startPos → endPos using the spherical bearing formula
 *   - prefers-reduced-motion: skip lerp, snap immediately
 *   - Cleanup: cancelAnimationFrame on unmount or new position arrival
 */

import { useState, useEffect, useRef } from 'react'
import type { TrackingPosition } from '@/lib/types/tracking'

// ─── Math helpers ─────────────────────────────────────────────────────────────

/**
 * Compass bearing from `from` to `to` in degrees [0, 360).
 * 0 = North, 90 = East, 180 = South, 270 = West.
 */
function computeBearing(from: TrackingPosition, to: TrackingPosition): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Ease-in-out cubic: smooth start and end */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimatedPosition {
  /** Current interpolated latitude */
  lat: number
  /** Current interpolated longitude */
  lng: number
  /**
   * Compass bearing (degrees) from previous position to current target.
   * null until the marker has moved at least once.
   */
  heading: number | null
  /** True while an animation frame loop is running */
  isAnimating: boolean
}

interface UseAnimatedPositionOptions {
  position: TrackingPosition | null
  /** Animation duration in ms. Default: 1600 (comfortable for vehicle movement) */
  duration?: number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns a smoothly-interpolated `AnimatedPosition` that updates at ~60 fps
 * as the underlying `position` changes discretely via Realtime events.
 */
export function useAnimatedPosition({
  position,
  duration = 1600,
}: UseAnimatedPositionOptions): AnimatedPosition {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  // Last settled (end-of-animation) position — used as start for next animation
  const settledRef = useRef<TrackingPosition | null>(position)
  const headingRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const [display, setDisplay] = useState<TrackingPosition | null>(position)
  const [heading, setHeading] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!position) return

    const from = settledRef.current ?? position
    const to = position

    // Haversine-approximated distance (cheap check to avoid no-op animations)
    const dLat = Math.abs(to.lat - from.lat)
    const dLng = Math.abs(to.lng - from.lng)
    const moved = dLat > 0.000005 || dLng > 0.000005 // ~0.5 m threshold

    if (moved) {
      const newBearing = computeBearing(from, to)
      headingRef.current = newBearing
      setHeading(newBearing)
    }

    // Snap immediately when no movement or reduced motion
    if (!moved || prefersReducedMotion) {
      settledRef.current = position
      setDisplay(position)
      setIsAnimating(false)
      return
    }

    // Cancel any in-flight animation before starting a new one
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const startTime = performance.now()
    const startLat = from.lat
    const startLng = from.lng
    const endLat = to.lat
    const endLng = to.lng

    setIsAnimating(true)

    function tick(now: number) {
      const elapsed = now - startTime
      const rawT = Math.min(elapsed / duration, 1)
      const t = easeInOut(rawT)

      const lat = lerp(startLat, endLat, t)
      const lng = lerp(startLng, endLng, t)

      setDisplay({ lat, lng })

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        settledRef.current = { lat: endLat, lng: endLng }
        rafRef.current = null
        setIsAnimating(false)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setIsAnimating(false)
    }
  }, [position, duration, prefersReducedMotion])

  return {
    lat: display?.lat ?? position?.lat ?? 0,
    lng: display?.lng ?? position?.lng ?? 0,
    heading,
    isAnimating,
  }
}
