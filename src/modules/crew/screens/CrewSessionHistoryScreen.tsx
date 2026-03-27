import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useToast } from '@/components/ui/Toast'
import { crewLiveService } from '@/features/crew-live/services/crew-live-service'
import { formatRelativeTime } from '@/lib/formatters'

export default function CrewSessionHistoryScreen() {
  const { addToast } = useToast()
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true)
      try {
        const data = await crewLiveService.listHistory(12)
        setSessions(data || [])
      } catch (loadError: any) {
        addToast(loadError?.message || 'Failed to load session history.', 'error')
      } finally {
        setIsLoading(false)
      }
    }

    void loadHistory()
  }, [addToast])

  return (
    <div className="page-container py-8 md:py-10 max-w-2xl">
      <div className="mb-6">
        <p className="text-tag text-[var(--color-accent)]">Crew History</p>
        <h1 className="mt-2 text-h1">Recent sessions</h1>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          Quick read-only view of your recent live runs.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--color-text-secondary)]">Loading history...</div>
      ) : sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{session.nganyas?.name || 'Mapped nganya'}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    {session.nganyas?.corridors?.name || 'Unknown corridor'} · {session.direction === 'TO_TOWN' ? 'To Town' : 'From Town'}
                  </div>
                </div>
                <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${session.status === 'LIVE' ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'bg-[var(--glass-bg-strong)] text-[var(--color-text-secondary)]'}`}>
                  {session.status}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
                <span>Started {formatRelativeTime(session.started_at)}</span>
                <span>{session.ended_at ? `Ended ${formatRelativeTime(session.ended_at)}` : 'Still active'}</span>
                <span>{session.seats_left === 0 ? 'Ended full' : `${session.seats_left} seats left`}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 text-sm text-[var(--color-text-secondary)]">
          No crew sessions yet.
        </div>
      )}

      <Link to="/crew/live" className="mt-5 inline-block text-sm text-[var(--color-accent)] no-underline">
        Back to live controls
      </Link>
    </div>
  )
}
