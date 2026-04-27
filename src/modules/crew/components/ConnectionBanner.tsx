import Button from '@/components/ui/Button'

interface ConnectionBannerProps {
  status: 'healthy' | 'poor' | 'retrying' | 'offline'
  message: string | null
  onRetry?: () => void
}

export function ConnectionBanner({ status, message, onRetry }: ConnectionBannerProps) {
  if (status === 'healthy' && !message) return null

  const palette = status === 'offline'
    ? 'border-red-500/30 bg-red-500/10 text-red-200'
    : status === 'poor'
      ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-warning)]'
      : 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]'

  return (
    <div className={`rounded-[var(--radius-lg)] border p-4 ${palette}`}>
      <div className="text-sm font-semibold">
        {status === 'offline'
          ? 'Offline'
          : status === 'poor'
            ? 'Poor connection'
            : 'Retrying live update'}
      </div>
      <div className="mt-1 text-sm opacity-90">{message || 'Live updates will retry automatically.'}</div>
      {onRetry ? (
        <Button variant="secondary" className="mt-3 min-h-[48px]" onClick={onRetry}>
          Retry now
        </Button>
      ) : null}
    </div>
  )
}
