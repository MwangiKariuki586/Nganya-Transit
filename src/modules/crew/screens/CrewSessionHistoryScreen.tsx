import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { InlineErrorState } from '@/components/error/InlineErrorState'
import { crewLiveService } from '@/features/crew-live/services/crew-live-service'
import { formatDirectionLabel, formatRelativeTime } from '@/lib/formatters'

function formatDuration(start: string, end: string | null): string {
  if (!end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatTotalTime(totalMs: number): string {
  const totalMin = Math.floor(totalMs / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function CrewSessionHistoryScreen() {
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await crewLiveService.listHistory(50)
        setSessions(data || [])
      } catch (error: any) {
        setLoadError(error?.message || 'Failed to load session history.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadHistory()
  }, [])

  const summary = useMemo(() => {
    if (sessions.length === 0) return null

    const ended = sessions.filter((s) => s.ended_at)
    const totalMs = ended.reduce(
      (acc, s) =>
        acc + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()),
      0,
    )

    const directionTally = { TO_TOWN: 0, FROM_TOWN: 0 }
    for (const s of sessions) {
      if (s.direction === 'TO_TOWN') directionTally.TO_TOWN++
      else if (s.direction === 'FROM_TOWN') directionTally.FROM_TOWN++
    }
    const busiestDirection =
      directionTally.TO_TOWN >= directionTally.FROM_TOWN ? 'TO_TOWN' : 'FROM_TOWN'
    const corridorName = sessions[0]?.nganyas?.corridors?.name ?? undefined
    const busiestLabel =
      formatDirectionLabel(busiestDirection, corridorName) ?? busiestDirection

    return {
      totalSessions: sessions.length,
      totalTime: formatTotalTime(totalMs),
      busiestDirection: busiestLabel,
    }
  }, [sessions])

  return (
    <div className="page-container py-8 md:py-10 max-w-2xl">
      <div className="mb-6">
        <p className="text-tag text-[var(--color-accent)]">Crew History</p>
        <h1 className="mt-2 text-h1">Recent sessions</h1>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Read-only view of your live runs.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--color-text-secondary)]">Loading history...</div>
      ) : loadError ? (
        <InlineErrorState
          title="Session history failed to load"
          message={loadError}
          onRetry={() => window.location.reload()}
        />
      ) : sessions.length > 0 ? (
        <>
          {/* Summary bar */}
          {summary && (
            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { label: 'Total sessions', value: String(summary.totalSessions) },
                { label: 'Total time', value: summary.totalTime },
                { label: 'Busiest direction', value: summary.busiestDirection },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-center"
                >
                  <div className="text-base font-bold text-[var(--color-text-primary)]">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Session cards */}
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {session.nganyas?.name || 'Mapped nganya'}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                      {session.nganyas?.corridors?.name || 'Unknown corridor'}
                      {' · '}
                      {formatDirectionLabel(
                        session.direction,
                        session.nganyas?.corridors?.name,
                      ) ?? session.direction}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      session.status === 'LIVE'
                        ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                        : 'bg-[var(--glass-bg-strong)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {session.status}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
                  <span>Started {formatRelativeTime(session.started_at)}</span>
                  <span>Duration {formatDuration(session.started_at, session.ended_at)}</span>
                  <span>
                    {session.seats_left === 0
                      ? 'Ended full'
                      : `${session.seats_left} seats left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 text-sm text-[var(--color-text-secondary)]">
          No crew sessions yet.
        </div>
      )}

      <Link
        to="/crew/live"
        className="mt-5 inline-block text-sm text-[var(--color-accent)] no-underline"
      >
        Back to live controls
      </Link>
    </div>
  )
}
