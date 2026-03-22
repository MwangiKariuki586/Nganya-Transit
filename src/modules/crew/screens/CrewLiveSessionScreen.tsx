import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import Button from '@/components/ui/Button'
import { crewLiveService } from '@/features/crew-live/services/crew-live-service'
import { ConnectionBanner } from '@/modules/crew/components/ConnectionBanner'
import { CrewHeaderStatus } from '@/modules/crew/components/CrewHeaderStatus'
import { DirectionToggle } from '@/modules/crew/components/DirectionToggle'
import { PermissionBanner } from '@/modules/crew/components/PermissionBanner'
import { SeatsQuickButtons } from '@/modules/crew/components/SeatsQuickButtons'
import { useCrewLiveSession } from '@/modules/crew/hooks/useCrewLiveSession'
import { clearCrewActiveSessionId } from '@/modules/crew/lib/storage'

interface CrewLiveSessionScreenProps {
  sessionId: string
}

export default function CrewLiveSessionScreen({ sessionId }: CrewLiveSessionScreenProps) {
  const navigate = useNavigate()
  const [initialSession, setInitialSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStopping, setIsStopping] = useState(false)

  useEffect(() => {
    async function loadSession() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const session = await crewLiveService.getSession(sessionId)
        setInitialSession(session)
      } catch (error: any) {
        setLoadError(error?.message || 'Failed to load live session.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadSession()
  }, [sessionId])

  const {
    session,
    permissionStatus,
    connectionStatus,
    connectionMessage,
    lastPingAgeMs,
    isPinging,
    requestPermission,
    updateSeats,
    updateDirection,
    stopSession,
    retryNow,
  } = useCrewLiveSession(initialSession)

  const handleStop = async () => {
    setIsStopping(true)
    try {
      await stopSession()
      clearCrewActiveSessionId()
      navigate({ to: '/crew/live' })
    } catch (error: any) {
      setLoadError(error?.message || 'Failed to stop live session.')
    } finally {
      setIsStopping(false)
    }
  }

  if (isLoading) {
    return <div className="page-container py-12 text-sm text-[var(--color-text-secondary)]">Loading live session...</div>
  }

  if (loadError || !session) {
    return (
      <div className="page-container py-12">
        <div className="rounded-[var(--radius-xl)] border border-red-500/30 bg-red-500/10 p-5 text-red-200">
          {loadError || 'This live session is not available.'}
        </div>
        <Link to="/crew/live" className="mt-4 inline-block text-sm text-[var(--color-accent)] no-underline">
          Back to crew live setup
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container py-8 md:py-10 max-w-2xl space-y-5">
      <CrewHeaderStatus
        isLive={session.status === 'LIVE'}
        nganyaName={session.nganyas?.name || 'Mapped nganya'}
        corridorName={session.nganyas?.corridors?.name || 'Unknown corridor'}
        direction={session.direction}
        seatsLeft={session.seats_left}
        lastPingAt={session.last_ping_at}
        lastPingAgeMs={lastPingAgeMs}
      />

      <PermissionBanner status={permissionStatus} onRequest={() => { void requestPermission().catch(() => null) }} />
      <ConnectionBanner status={connectionStatus} message={connectionMessage} onRetry={() => { void retryNow() }} />

      {loadError ? (
        <div className="rounded-[var(--radius-lg)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-caption text-[var(--color-text-tertiary)]">Seats update</div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Tap once, push instantly. Last ping refreshes every 15 seconds while this screen stays open.
            </div>
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{isPinging ? 'Syncing...' : 'Synced'}</div>
        </div>
        <div className="mt-4">
          <SeatsQuickButtons value={session.seats_left} onChange={(value) => { void updateSeats(value) }} disabled={isPinging} />
        </div>
        {session.seats_left === 0 ? (
          <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
            Full selected. If boarding is closed for a while, consider stopping the session once the route clears.
          </div>
        ) : null}
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
        <div className="text-caption text-[var(--color-text-tertiary)]">Direction</div>
        <div className="mt-3">
          <DirectionToggle
            value={session.direction}
            onChange={(value) => { void updateDirection(value) }}
            disabled={isPinging}
            toTownLabel="→ Town"
            fromTownLabel={`→ ${session.nganyas?.corridors?.name || 'Terminal'}`}
          />
        </div>
        <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
          If route direction changes hard, stop and restart is still the safer operational flow.
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button variant="secondary" className="min-h-[56px]" onClick={() => navigate({ to: '/crew/history' })}>
          Session history
        </Button>
        <Button variant="primary" className="min-h-[56px] bg-red-500 hover:bg-red-500/90 shadow-none" isLoading={isStopping} onClick={handleStop}>
          Stop session
        </Button>
      </div>
    </div>
  )
}
