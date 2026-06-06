/**
 * TrackDrawer — Map-first tracking experience.
 *
 * This component is the single entry point for tracking a nganya.
 * It delegates entirely to TrackingMapOverlay, which provides:
 *   - Full-screen MapLibre GL map as the primary layer
 *   - Nganya, pickup stage, and user-location markers
 *   - Snap-point bottom sheet (collapsed / half / expanded)
 *   - LIVE / ESTIMATED / STALE signal source states
 *   - Catchability status (CATCHABLE / RISKY / TOO_FAR / STALE_UNCERTAIN)
 *   - Plan B alternatives when signal degrades
 *   - Boarded / Missed feedback loop
 *   - Realtime subscriptions with automatic cleanup on close
 *
 * Props are intentionally identical to the previous modal-based TrackDrawer
 * so all callers (SearchResultsOverlayV2, HomeScreen, FollowingScreen) require
 * zero changes.
 */

import TrackingMapOverlay from './TrackingMapOverlay'
import type { JourneyResult } from '@/lib/types/journey'

interface Props {
  isOpen: boolean
  onClose: () => void
  nganya: JourneyResult
  stage: { id: string; name: string }
  allResults?: JourneyResult[]
  onSwitch?: (nganya: JourneyResult) => void
}

export default function TrackDrawer(props: Props) {
  return <TrackingMapOverlay {...props} />
}
