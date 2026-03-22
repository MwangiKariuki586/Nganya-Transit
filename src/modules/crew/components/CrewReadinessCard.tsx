import { AlertTriangle, CheckCircle2, ChevronDown, CircleDashed, LocateFixed, Wifi, WifiOff } from 'lucide-react'
import Button from '@/components/ui/Button'

type ItemStatus = 'done' | 'pending' | 'warning' | 'error'
type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported'
type NetworkStatus = 'healthy' | 'poor' | 'offline'
type GpsQuality = 'good' | 'weak' | null

interface ChecklistItem {
  id: string
  label: string
  status: ItemStatus
  detail?: string | null
}

interface CrewReadinessCardProps {
  items: ChecklistItem[]
  permissionStatus: PermissionStatus
  lastFixAt?: string | null
  gpsQuality?: GpsQuality
  networkStatus: NetworkStatus
  networkMessage?: string | null
  onEnableLocation?: () => void
  compact?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

function formatFixTime(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getStatusIcon(status: ItemStatus) {
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-[var(--color-green)]" />
  }

  if (status === 'warning') {
    return <AlertTriangle className="h-4 w-4 text-amber-300" />
  }

  if (status === 'error') {
    return <AlertTriangle className="h-4 w-4 text-red-300" />
  }

  return <CircleDashed className="h-4 w-4 text-[var(--color-text-tertiary)]" />
}

function getStatusLabel(status: ItemStatus) {
  if (status === 'done') return 'Ready'
  if (status === 'warning') return 'Check'
  if (status === 'error') return 'Blocked'
  return 'Waiting'
}

function getLocationCopy(permissionStatus: PermissionStatus, fixTime: string | null, gpsQuality: GpsQuality) {
  if (permissionStatus === 'granted') {
    const quality = gpsQuality === 'good' ? 'GPS good' : gpsQuality === 'weak' ? 'GPS weak' : null
    const suffix = [fixTime ? `last fix ${fixTime}` : null, quality].filter(Boolean).join(' | ')
    return suffix ? `Enabled, ${suffix}` : 'Enabled and ready'
  }

  if (permissionStatus === 'denied') {
    return 'Blocked. Open browser or device settings, allow location for this site, then retry.'
  }

  if (permissionStatus === 'unsupported') {
    return 'This device/browser does not expose location, so Live cannot start here.'
  }

  return 'Enable location to start Live. Shared only while Live.'
}

function getNetworkCopy(networkStatus: NetworkStatus, networkMessage: string | null) {
  if (networkMessage) {
    return networkMessage
  }

  if (networkStatus === 'offline') {
    return 'Offline. Reconnect before going Live.'
  }

  if (networkStatus === 'poor') {
    return 'Signal looks weak. Start may retry.'
  }

  return 'Online and ready.'
}

export function CrewReadinessCard({
  items,
  permissionStatus,
  lastFixAt,
  gpsQuality = null,
  networkStatus,
  networkMessage = null,
  onEnableLocation,
  compact = false,
  collapsed = false,
  onToggle,
}: CrewReadinessCardProps) {
  const readyCount = items.filter((item) => item.status === 'done').length
  const progress = `${Math.round((readyCount / items.length) * 100)}%`
  const fixTime = formatFixTime(lastFixAt)
  const showLocationAction = permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && Boolean(onEnableLocation)
  const locationCopy = getLocationCopy(permissionStatus, fixTime, gpsQuality)
  const networkCopy = getNetworkCopy(networkStatus, networkMessage)

  return (
    <section className="rounded-[22px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-4 shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-tag text-[var(--color-accent)]">Preflight</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <span>Readiness {readyCount}/{items.length}</span>
            {onToggle ? (
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--glass-border)] text-[var(--color-text-tertiary)]"
                onClick={onToggle}
                aria-label={collapsed ? 'Expand readiness' : 'Collapse readiness'}
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? '-rotate-90' : 'rotate-0'}`} />
              </button>
            ) : null}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
            <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: progress }} />
          </div>
        </div>

        {showLocationAction ? (
          <Button
            variant="secondary"
            className={`min-h-[40px] rounded-[16px] px-3 text-sm font-semibold ${compact ? 'w-auto' : ''} ${collapsed ? 'self-center' : ''}`}
            onClick={onEnableLocation}
          >
            {permissionStatus === 'denied' ? 'Retry location' : 'Enable location'}
          </Button>
        ) : null}
      </div>

      {!collapsed ? (
        <>
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 text-sm">
                    {getStatusIcon(item.status)}
                    <span className="truncate text-[var(--color-text-primary)]">{item.label}</span>
                  </div>
                  <span className="text-caption text-[var(--color-text-tertiary)]">
                    {getStatusLabel(item.status)}
                  </span>
                </div>
                {item.detail ? (
                  <div className="mt-1.5 pl-6 text-caption text-[var(--color-text-secondary)]">
                    {item.detail}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <LocateFixed className="h-4 w-4 text-[var(--color-accent)]" />
                  <span>Location</span>
                </div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{locationCopy}</div>
              </div>
              <div className="rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-caption text-[var(--color-text-tertiary)]">
                Shared only while Live
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  {networkStatus === 'offline' ? (
                    <WifiOff className="h-4 w-4 text-red-300" />
                  ) : (
                    <Wifi className={`h-4 w-4 ${networkStatus === 'poor' ? 'text-amber-300' : 'text-[var(--color-green)]'}`} />
                  )}
                  <span>Network</span>
                </div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{networkCopy}</div>
              </div>
              <div
                className={`rounded-[var(--radius-full)] border px-2.5 py-1 text-caption ${
                  networkStatus === 'offline'
                    ? 'border-red-500/30 bg-red-500/10 text-red-200'
                    : networkStatus === 'poor'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {networkStatus === 'offline' ? 'Offline' : networkStatus === 'poor' ? 'Poor' : 'Online'}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
