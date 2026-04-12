import { useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ErrorDetailsDevOnly } from './ErrorDetailsDevOnly'
import { getUserMessage, toAppError } from '@/shared/errors/app-error'
import { reportAppError } from '@/shared/errors/reporting'

export interface RouteErrorFallbackProps {
  error: unknown
  reset: () => void
  title?: string
  homeTarget?: '/' | '/discover' | '/crew' | '/admin'
  retryLabel?: string
  routeId?: string
}

export function RouteErrorFallback({
  error,
  reset,
  title = 'Something broke on this page',
  homeTarget = '/discover',
  retryLabel = 'Try again',
  routeId,
}: RouteErrorFallbackProps) {
  const router = useRouter()
  const normalized = toAppError(error)

  useEffect(() => {
    reportAppError(normalized, {
      area: 'route',
      routeId,
    })
  }, [normalized, routeId])

  const homeLabel =
    homeTarget === '/admin'
      ? 'Admin home'
      : homeTarget === '/crew'
        ? 'Crew home'
        : homeTarget === '/'
          ? 'Go home'
          : 'Discover'

  return (
    <div className="page-container py-10 md:py-14">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(18,18,26,0.94)] p-6 shadow-[var(--shadow-lg)] md:p-8">
        <p className="text-tag text-[var(--color-accent)]">Error state</p>
        <h1 className="mt-2 text-h2 text-white">{title}</h1>
        <p className="mt-3 text-body text-[var(--color-text-secondary)]">
          {getUserMessage(normalized)}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              reset()
              await router.invalidate()
            }}
            className="rounded-[16px] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            {retryLabel}
          </button>
          <Link
            to={homeTarget}
            className="rounded-[16px] border border-[var(--glass-border)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            {homeLabel}
          </Link>
          {normalized.code === 'AUTH_REQUIRED' ? (
            <Link
              to="/signin"
              className="rounded-[16px] border border-[var(--glass-border)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          ) : null}
        </div>

        <div className="mt-6">
          <ErrorDetailsDevOnly error={error} />
        </div>
      </div>
    </div>
  )
}
