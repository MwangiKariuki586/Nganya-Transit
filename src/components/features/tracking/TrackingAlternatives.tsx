/**
 * TrackingAlternatives — Plan B panel shown when signal is stale/risky/too-far.
 * Surfaces nearby alternatives so users are never left stranded.
 */

import { Zap } from 'lucide-react'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge'
import { LoadingButton } from '@/components/ui/loading'
import type { JourneyResult } from '@/lib/types/journey'
import type { CatchabilityStatus } from '@/lib/types/tracking'

interface TrackingAlternativesProps {
  alternatives: JourneyResult[]
  catchabilityStatus: CatchabilityStatus
  onSwitch: (alt: JourneyResult) => void
}

const headerCopy: Record<CatchabilityStatus, { title: string; subtitle: string }> = {
  STALE_UNCERTAIN: {
    title: 'Signal lost — Plan B',
    subtitle: "Here are the next best options on this corridor",
  },
  TOO_FAR: {
    title: 'Better options nearby',
    subtitle: 'These will arrive before you can catch your current pick',
  },
  RISKY: {
    title: 'Cutting it close — alternatives',
    subtitle: 'You might want a backup option',
  },
  CATCHABLE: {
    title: 'More options on this corridor',
    subtitle: "Switch if you'd prefer an earlier or more reliable nganya",
  },
}

export default function TrackingAlternatives({
  alternatives,
  catchabilityStatus,
  onSwitch,
}: TrackingAlternativesProps) {
  if (alternatives.length === 0) return null

  const { title, subtitle } = headerCopy[catchabilityStatus]

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Zap className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {alternatives.map((alt) => (
          <AlternativeCard key={alt.nganya_id} alt={alt} onSwitch={onSwitch} />
        ))}
      </div>
    </div>
  )
}

function AlternativeCard({
  alt,
  onSwitch,
}: {
  alt: JourneyResult
  onSwitch: (alt: JourneyResult) => void
}) {
  const isLive = alt.source === 'LIVE'

  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--color-accent-soft)] transition-colors">
      {/* Signal dot */}
      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-[var(--glass-border)]"
        style={{ backgroundColor: isLive ? 'var(--color-green-soft)' : 'var(--glass-bg)' }}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${isLive ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: isLive
              ? 'var(--color-green)'
              : 'var(--color-text-tertiary)',
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
          {alt.nganya_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wide">
            {isLive ? 'Live' : 'Sighting'}
          </span>
          <ConfidenceBadge level={alt.confidence_level} />
        </div>
      </div>

      {/* ETA + CTA */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-lg font-bold text-[var(--color-accent)] leading-none">
          {alt.eta_minutes}m
        </span>
        <LoadingButton
          variant="secondary"
          size="sm"
          onClick={() => onSwitch(alt)}
          className="text-xs px-2 py-1 min-h-0"
        >
          Switch
        </LoadingButton>
      </div>
    </div>
  )
}
