import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useCrewBootstrap } from '@/modules/crew/context/CrewBootstrapContext'
import { getCrewStatusState } from '@/modules/crew/services/route-access'

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'Just now'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Just now'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function CrewPendingScreen() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { snapshot, refresh, isRefreshing } = useCrewBootstrap()
  const status = getCrewStatusState(snapshot)
  const request = snapshot.bootstrap.request
  const assignment = snapshot.bootstrap.assignment
  const activeSession = snapshot.bootstrap.active_session
  const hasSeenPendingRef = useRef(status === 'PENDING_APPROVAL')

  useEffect(() => {
    if (status === 'PENDING_APPROVAL') {
      hasSeenPendingRef.current = true
    }
  }, [status])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh()
    }, 20_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refresh])

  useEffect(() => {
    if (!hasSeenPendingRef.current) {
      return
    }

    if (status === 'ASSIGNED' && assignment) {
      addToast('Approved. Your nganya is ready to go live.', 'success')
      navigate({ to: '/crew/live' })
      return
    }

    if (status === 'LIVE_ACTIVE' && activeSession) {
      addToast('You already have a live session running.', 'info')
      navigate({
        to: '/crew/session/$id',
        params: { id: activeSession.id },
      })
    }
  }, [activeSession, addToast, assignment, navigate, status])

  const headline = useMemo(() => {
    if (status === 'NEEDS_INFO') {
      return {
        title: 'More information needed',
        body: 'Admin reviewed the request and needs more detail before approval.',
      }
    }

    if (status === 'REJECTED') {
      return {
        title: 'Registration needs attention',
        body: 'This request was rejected. Review the notes and head back through crew setup.',
      }
    }

    return {
      title: 'Pending review',
      body: 'Your request is in the admin queue. Once approved, your assignment will appear automatically and Go Live will unlock immediately.',
    }
  }, [status])

  return (
    <div className="page-container max-w-3xl py-8 md:py-10">
      <div className="rounded-[28px] border border-[var(--color-accent)]/30 bg-[var(--glass-bg-strong)] p-6 shadow-[var(--glow-accent-sm)]">
        <div className="text-tag text-[var(--color-accent)]">
          {status === 'PENDING_APPROVAL' ? 'Crew setup' : 'Request update'}
        </div>
        <h1 className="mt-2 text-h2 text-white">{headline.title}</h1>
        <p className="mt-3 text-body text-[var(--color-text-secondary)]">
          {headline.body}
        </p>

        <div className="mt-5 grid gap-3 rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 text-sm text-[var(--color-text-secondary)] md:grid-cols-2">
          <div>Status: {request?.status ?? 'UNKNOWN'}</div>
          <div>Last update: {formatTimestamp(request?.updated_at)}</div>
          <div>Assignment: {assignment ? assignment.nganya_name : 'Waiting for approval'}</div>
          <div>{isRefreshing ? 'Checking for updates…' : 'Auto-refresh every 20s'}</div>
        </div>

        {request?.review_notes ? (
          <div className="mt-5 rounded-[20px] border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-[var(--color-text-secondary)]">
            <div className="font-semibold text-[var(--color-text-primary)]">Admin note</div>
            <div className="mt-1">{request.review_notes}</div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="primary"
            className="min-h-[48px] rounded-[18px] px-5 text-sm font-semibold"
            onClick={() => {
              void refresh()
            }}
            isLoading={isRefreshing}
          >
            Check again
          </Button>
          <Link
            to="/crew"
            className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] border border-[var(--glass-border)] px-5 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-all hover:border-[var(--glass-border-hover)]"
          >
            Refresh crew setup
          </Link>
        </div>
      </div>
    </div>
  )
}
