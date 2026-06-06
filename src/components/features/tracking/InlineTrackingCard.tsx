/**
 * InlineTrackingCard — Compact inline tracking card below the corridor map.
 *
 * Shows the essential tracking info at a glance: name, ETA, signal, catchability,
 * and feedback actions. Full detail is available via the expand button which
 * opens the full-screen TrackingMapOverlay.
 */

import { useState } from 'react'
import { X, Maximize2, AlertTriangle } from 'lucide-react'

import { useTracking } from '@/hooks/useTracking'
import { useGeolocationStream } from '@/hooks/useGeolocationStream'
import {
  FeedbackActions,
  formatSecondsAgo,
} from '../TrackingMapOverlay'
import TrackingMapOverlay from '../TrackingMapOverlay'
import TrackingAlternatives from './TrackingAlternatives'
import CatchabilityBadge from '@/components/ui/CatchabilityBadge'
import TrackingSignalBadge from '@/components/ui/TrackingSignalBadge'

import type { JourneyResult } from '@/lib/types/journey'

interface InlineTrackingCardProps {
  nganya: JourneyResult
  stage: { id: string; name: string }
  allResults?: JourneyResult[]
  onClose: () => void
  onSwitch?: (nganya: JourneyResult) => void
  /** Square top corners when stacked directly under a map (avoids corner gap). */
  flushTop?: boolean
}

export default function InlineTrackingCard({
  nganya,
  stage,
  allResults = [],
  onClose,
  onSwitch,
  flushTop = false,
}: InlineTrackingCardProps) {
  const [showFullScreen, setShowFullScreen] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)

  const { coords: userCoords } = useGeolocationStream()

  const {
    payload,
    feedbackState,
    handleBoarded,
    handleMissed,
  } = useTracking({
    nganya,
    stage,
    allResults,
    isActive: true,
    userCoords: userCoords ? { lat: userCoords.lat, lng: userCoords.lng } : null,
  })

  const handleSwitch = (alt: JourneyResult) => {
    onSwitch?.(alt)
    setShowAlternatives(false)
  }

  if (showFullScreen) {
    return (
      <TrackingMapOverlay
        isOpen
        onClose={() => setShowFullScreen(false)}
        nganya={nganya}
        stage={stage}
        allResults={allResults}
        onSwitch={onSwitch}
      />
    )
  }

  return (
    <div
      className={
        flushTop
          ? 'rounded-b-[var(--radius-lg)] rounded-t-none border border-t-0 overflow-hidden animate-fade-in'
          : 'rounded-[var(--radius-lg)] border overflow-hidden animate-fade-in'
      }
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Header row — name + ETA + signal + actions */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* ETA */}
        <div className="shrink-0 text-center" style={{ minWidth: 48 }}>
          <span className="text-2xl font-bold leading-none" style={{ color: 'var(--color-accent)' }}>
            {payload.eta_minutes}
          </span>
          <span className="text-[10px] block" style={{ color: 'var(--color-text-tertiary)' }}>min</span>
        </div>

        {/* Name + catchability */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
            {payload.nganya_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <TrackingSignalBadge
              signalType={payload.source_type}
              freshnessSeconds={payload.freshness_seconds}
              compact
            />
            <CatchabilityBadge
              status={payload.catchability.status}
              label={payload.catchability.label}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowFullScreen(true)}
            className="p-1.5 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
            aria-label="Open full-screen map"
            title="Full-screen map"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
            aria-label="Close tracking"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stale warning — only when signal is lost */}
      {payload.source_type === 'STALE' && (
        <div className="mx-3 mb-2 flex items-center gap-2 p-2 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]">
          <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
          <p className="text-xs text-[var(--color-text-secondary)]">
            Signal lost · last update {formatSecondsAgo(payload.freshness_seconds)}
          </p>
        </div>
      )}

      {/* Feedback + alternatives */}
      <div className="px-3 pb-3">
        <FeedbackActions
          feedbackState={feedbackState}
          onBoarded={handleBoarded}
          onMissed={handleMissed}
          hasAlternatives={payload.alternatives.length > 0}
          onExpandForAlternatives={() => setShowAlternatives(!showAlternatives)}
        />

        {showAlternatives && payload.alternatives.length > 0 && (
          <div className="mt-3">
            <TrackingAlternatives
              alternatives={payload.alternatives}
              catchabilityStatus={payload.catchability.status}
              onSwitch={handleSwitch}
            />
          </div>
        )}
      </div>
    </div>
  )
}
