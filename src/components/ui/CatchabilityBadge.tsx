/**
 * CatchabilityBadge — Visual status indicator for whether a user can board.
 * Part of the map-first tracking experience.
 */

import type { CatchabilityStatus } from '@/lib/types/tracking'

interface CatchabilityBadgeProps {
  status: CatchabilityStatus
  label: string
  subtext?: string
  className?: string
}

const statusConfig: Record<
  CatchabilityStatus,
  { dot: string; pill: string; border: string }
> = {
  CATCHABLE: {
    dot: 'var(--color-green)',
    pill: 'var(--color-green-soft)',
    border: 'rgba(57,255,20,0.25)',
  },
  RISKY: {
    dot: 'var(--color-warning)',
    pill: 'var(--color-warning-soft)',
    border: 'rgba(255,193,7,0.3)',
  },
  TOO_FAR: {
    dot: 'var(--color-accent)',
    pill: 'var(--color-accent-soft)',
    border: 'var(--color-accent-border)',
  },
  STALE_UNCERTAIN: {
    dot: 'var(--color-text-tertiary)',
    pill: 'var(--glass-bg)',
    border: 'var(--glass-border)',
  },
}

export default function CatchabilityBadge({
  status,
  label,
  subtext,
  className = '',
}: CatchabilityBadgeProps) {
  const cfg = statusConfig[status]

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-full)] text-xs font-bold tracking-wide uppercase border self-start"
        style={{
          color: cfg.dot,
          backgroundColor: cfg.pill,
          borderColor: cfg.border,
        }}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${status === 'CATCHABLE' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: cfg.dot }}
        />
        {label}
      </span>
      {subtext && (
        <p className="text-[11px] text-[var(--color-text-tertiary)] pl-1">{subtext}</p>
      )}
    </div>
  )
}
