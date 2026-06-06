import Button from '@/components/ui/Button'

interface PermissionBannerProps {
  status: 'prompt' | 'granted' | 'denied' | 'unsupported'
  onRequest?: () => void
}

export function PermissionBanner({ status, onRequest }: PermissionBannerProps) {
  if (status === 'granted') return null

  const copy = {
    prompt: {
      title: 'Location permission needed',
      body: 'Crew pings use your device location while the session screen is open.',
      action: 'Enable location',
    },
    denied: {
      title: 'Location permission blocked',
      body: 'Open browser or device settings, allow location for this site, then retry.',
      action: 'Retry permission',
    },
    unsupported: {
      title: 'Location unavailable',
      body: 'This browser does not expose geolocation, so live pings cannot run.',
      action: null,
    },
  }[status]

  return (
    <div className="rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
      <div className="text-sm font-semibold text-[var(--color-warning)]">{copy.title}</div>
      <div className="mt-1 max-w-3xl text-sm text-[var(--color-text-primary)]/85">{copy.body}</div>
      {copy.action && onRequest ? (
        <Button
          variant="secondary"
          className="mt-3 min-h-[44px] rounded-[18px] border-white/10 bg-black/15 px-4 text-sm font-semibold text-white hover:bg-black/25"
          onClick={onRequest}
        >
          {copy.action}
        </Button>
      ) : null}
    </div>
  )
}
