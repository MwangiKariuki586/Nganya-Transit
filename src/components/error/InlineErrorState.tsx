interface InlineErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export function InlineErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: InlineErrorStateProps) {
  return (
    <div className="rounded-[24px] border border-[rgba(255,92,92,0.25)] bg-[rgba(120,20,20,0.12)] p-5 text-left">
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[var(--color-accent)]"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

export type { InlineErrorStateProps }
