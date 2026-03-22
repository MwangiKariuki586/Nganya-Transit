import { formatRelativeTime } from '@/lib/formatters'

interface CrewHeaderStatusProps {
  isLive: boolean
  nganyaName: string
  corridorName: string
  direction: string
  seatsLeft: number
  lastPingAt: string | null
  lastPingAgeMs?: number
}

export function CrewHeaderStatus({
  isLive,
  nganyaName,
  corridorName,
  direction,
  seatsLeft,
  lastPingAt,
  lastPingAgeMs = 0,
}: CrewHeaderStatusProps) {
  const isStale = lastPingAgeMs > 90000

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-[var(--color-accent)] shadow-[var(--glow-accent-sm)] animate-pulse' : 'bg-[var(--color-text-tertiary)]'}`} />
        {isLive ? 'Live session active' : 'Session offline'}
      </div>
      <div className="mt-3">
        <h1 className="text-h2 text-[var(--color-text-primary)]">{nganyaName}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {corridorName} · {direction === 'TO_TOWN' ? 'To Town' : 'From Town'}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-bg-base)]/50 p-3">
          <div className="text-[var(--color-text-tertiary)]">Seats</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
            {seatsLeft === 0 ? 'Full' : seatsLeft}
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-bg-base)]/50 p-3">
          <div className="text-[var(--color-text-tertiary)]">Last update</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
            {lastPingAt ? formatRelativeTime(lastPingAt) : 'Waiting'}
          </div>
          {isStale ? (
            <div className="mt-1 text-caption text-amber-300">Update is stale</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
