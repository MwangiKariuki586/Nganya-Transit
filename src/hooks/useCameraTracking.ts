/**
 * useCameraTracking — Auto/free map camera manager for live tracking.
 *
 * Two modes:
 *   auto  — camera automatically fits/follows nganya + user as they move
 *   free  — user has panned the map; camera stays put; recenter FAB appears
 *
 * Transitions:
 *   auto → free  triggered by onUserPan() (called from map's onDragStart — not onMoveStart,
 *     which also fires for programmatic camera animations)
 *   free → auto  triggered by recenter() (called when user taps the FAB)
 *
 * Implementation details:
 *   - Uses a `isProgrammatic` ref flag to distinguish user pans from our own
 *     camera moves so we don't accidentally flip to free mode on auto-fit.
 *   - De-duplicates fit calls via a position key string so we don't spam the
 *     camera when other state updates trigger re-renders.
 *   - Respects prefers-reduced-motion: no animation duration.
 */

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import type { TrackingPosition } from '@/lib/types/tracking'

// ─── Config ───────────────────────────────────────────────────────────────────

/** Padding around all markers when fitting bounds. Extra bottom = sheet height. */
const FIT_PADDING = { top: 100, bottom: 340, left: 80, right: 80 } as const

/** Duration for smooth camera animations in ms */
const EASE_MS = 1000

/** Minimum coordinate change (degrees) to trigger a camera update */
const MIN_DELTA = 0.0001 // ~11 metres

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseCameraTrackingOptions {
  mapRef: RefObject<MapRef | null>
  /** Animated nganya position (from useAnimatedPosition) */
  nganyaPosition: TrackingPosition | null
  stagePosition: TrackingPosition | null
  userPosition: TrackingPosition | null
  isActive: boolean
}

export interface UseCameraTrackingReturn {
  /** Whether the camera is in automatic follow mode */
  isAutoTracking: boolean
  /**
   * Pass to the Map component's onDragStart handler (not onMoveStart).
   * Detects user-initiated pans and switches to free mode.
   */
  onUserPan: () => void
  /** Snap back to auto mode and re-fit all markers */
  recenter: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a dedup key from up to 3 positions (rounded to MIN_DELTA grid) */
function posKey(
  a: TrackingPosition | null,
  b: TrackingPosition | null,
  c: TrackingPosition | null,
): string {
  return [a, b, c]
    .filter(Boolean)
    .map((p) => {
      const lat = Math.round(p!.lat / MIN_DELTA) * MIN_DELTA
      const lng = Math.round(p!.lng / MIN_DELTA) * MIN_DELTA
      return `${lat.toFixed(5)},${lng.toFixed(5)}`
    })
    .join('|')
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCameraTracking({
  mapRef,
  nganyaPosition,
  stagePosition,
  userPosition,
  isActive,
}: UseCameraTrackingOptions): UseCameraTrackingReturn {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const [isAutoTracking, setIsAutoTracking] = useState(true)

  /**
   * When we programmatically move the camera we set this ref to true so
   * the onUserPan handler ignores the resulting onMoveStart event.
   */
  const isProgrammaticRef = useRef(false)

  /** Last key for which we fired a camera move — avoids duplicate calls */
  const lastKeyRef = useRef('')

  const fireCamera = useCallback(
    (animate: boolean) => {
      const map = mapRef.current
      if (!map) return

      const points = [nganyaPosition, userPosition, stagePosition].filter(
        Boolean,
      ) as TrackingPosition[]

      if (points.length === 0) return

      const key = posKey(nganyaPosition, userPosition, stagePosition)
      if (key === lastKeyRef.current && animate) return
      lastKeyRef.current = key

      const duration = animate && !prefersReducedMotion ? EASE_MS : 0

      isProgrammaticRef.current = true

      if (points.length === 1) {
        map.flyTo({
          center: [points[0].lng, points[0].lat],
          zoom: 16,
          duration,
        })
      } else {
        const lngs = points.map((p) => p.lng)
        const lats = points.map((p) => p.lat)
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          {
            padding: FIT_PADDING,
            maxZoom: 17,
            duration,
            essential: true,
          },
        )
      }

      // Reset flag after animation completes
      setTimeout(
        () => { isProgrammaticRef.current = false },
        duration + 300,
      )
    },
    [mapRef, nganyaPosition, userPosition, stagePosition, prefersReducedMotion],
  )

  // Auto-track: re-fit when any position changes (only when in auto mode)
  useEffect(() => {
    if (!isActive || !isAutoTracking) return
    fireCamera(true)
  }, [isActive, isAutoTracking, fireCamera])

  const onUserPan = useCallback(() => {
    // Ignore pans we triggered ourselves
    if (isProgrammaticRef.current) return
    setIsAutoTracking(false)
  }, [])

  const recenter = useCallback(() => {
    lastKeyRef.current = '' // force re-fit even if positions haven't changed
    setIsAutoTracking(true)
    // Fire immediately (setIsAutoTracking is async; don't wait for the effect)
    fireCamera(true)
  }, [fireCamera])

  return { isAutoTracking, onUserPan, recenter }
}
