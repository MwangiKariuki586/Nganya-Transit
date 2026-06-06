/**
 * Tracking Signal — Canonical helpers for resolving signal freshness and state.
 *
 * ALL freshness / signal-state logic lives here.
 * Components and hooks import from this module — never inline thresholds.
 *
 * Signal state model:
 *
 *  Live GPS source:
 *    LIVE      → last_ping_at ≤ 30 s ago
 *    ESTIMATED → last_ping_at 31–90 s ago  (aging, still usable)
 *    STALE     → last_ping_at 91 s – 15 min (last-known location only)
 *    EXPIRED   → last_ping_at > 15 min      (hide from live surfaces)
 *
 *  Sighting source:
 *    ESTIMATED → created_at ≤ 10 min ago   (fresh sighting)
 *    STALE     → created_at 10–30 min ago  (aging sighting, last-known)
 *    EXPIRED   → created_at > 30 min ago   (hide from live surfaces)
 *
 * Spec naming aliases (Unit 05):
 *  Live GPS freshness states (getLiveSessionFreshness):
 *    LIVE    → ≤ 30 s
 *    AGING   → 31–90 s   (maps to ESTIMATED in TrackingSignalType)
 *    STALE   → 91 s – 15 min
 *    EXPIRED → > 15 min
 *
 *  Sighting freshness states (getSightingFreshness):
 *    FRESH_SIGHTING  → ≤ 10 min
 *    AGING_SIGHTING  → 10–30 min
 *    EXPIRED_SIGHTING → > 30 min
 *
 * Marker visual language:
 *    LIVE      → solid green ring, pulse halo, motion trail
 *    ESTIMATED → amber ring, no pulse  (same as AGING)
 *    STALE     → grey ring, dashed outline, 0.45 opacity, no pulse, no trail
 *    EXPIRED   → not rendered on live map
 *
 * Route line language:
 *    LIVE      → solid pink line, full opacity
 *    ESTIMATED → semi-dashed pink line, 0.7 opacity
 *    STALE     → dashed grey line, 0.4 opacity
 *    EXPIRED   → not rendered
 */

import { TRACKING_THRESHOLDS, type TrackingSignalType } from './types/tracking'

// ─── Spec-named freshness state types (Unit 05) ───────────────────────────────

/**
 * Freshness state for a live GPS session.
 * Spec-canonical names — use these in new code.
 * Maps to TrackingSignalType: LIVE→LIVE, AGING→ESTIMATED, STALE→STALE, EXPIRED→EXPIRED
 */
export type LiveSessionFreshnessState = 'LIVE' | 'AGING' | 'STALE' | 'EXPIRED'

/**
 * Freshness state for a fan sighting.
 * Spec-canonical names — use these in new code.
 */
export type SightingFreshnessState = 'FRESH_SIGHTING' | 'AGING_SIGHTING' | 'EXPIRED_SIGHTING'

// ─── Core resolvers ───────────────────────────────────────────────────────────

/**
 * Resolve signal state for a live GPS session.
 * @param lastPingAt  ISO string or Date of the last crew ping.
 */
export function getLiveSessionSignalState(lastPingAt: string | Date): TrackingSignalType {
  const ts = lastPingAt instanceof Date ? lastPingAt.getTime() : new Date(lastPingAt).getTime()
  if (!Number.isFinite(ts)) return 'STALE'

  const ageSec = (Date.now() - ts) / 1_000

  if (ageSec <= TRACKING_THRESHOLDS.LIVE_FRESH_MAX_S) return 'LIVE'
  if (ageSec <= TRACKING_THRESHOLDS.LIVE_AGING_MAX_S) return 'ESTIMATED'
  if (ageSec <= TRACKING_THRESHOLDS.LIVE_SESSION_EXPIRES_MIN * 60) return 'STALE'
  return 'EXPIRED'
}

/**
 * Resolve signal state for a sighting.
 * @param createdAt  ISO string or Date of the sighting.
 */
export function getSightingSignalState(createdAt: string | Date): TrackingSignalType {
  const ts = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime()
  if (!Number.isFinite(ts)) return 'STALE'

  const ageMin = (Date.now() - ts) / 60_000

  if (ageMin <= TRACKING_THRESHOLDS.SIGHTING_FRESH_MAX_MIN) return 'ESTIMATED'
  if (ageMin <= TRACKING_THRESHOLDS.SIGHTING_EXPIRES_MIN) return 'STALE'
  return 'EXPIRED'
}

/**
 * Unified resolver — picks the right freshness function based on source.
 *
 * @param source      'LIVE' (crew GPS session) | 'SIGHTING'
 * @param observedAt  ISO string or Date of last_ping_at / sighting created_at
 */
export function getTrackingSignalState(
  source: 'LIVE' | 'SIGHTING',
  observedAt: string | Date,
): TrackingSignalType {
  return source === 'LIVE'
    ? getLiveSessionSignalState(observedAt)
    : getSightingSignalState(observedAt)
}

// ─── Spec-named freshness helpers (Unit 05) ───────────────────────────────────

/**
 * Resolve freshness state for a live GPS session using spec-canonical names.
 *
 * AGING (31–90 s) is the spec's name for what the existing system calls ESTIMATED.
 * Both represent the same visual state — amber ring, no pulse, still usable.
 *
 * @param lastPingAt  ISO string or Date of the last crew ping.
 */
export function getLiveSessionFreshness(lastPingAt: string | Date): LiveSessionFreshnessState {
  const ts = lastPingAt instanceof Date ? lastPingAt.getTime() : new Date(lastPingAt).getTime()
  if (!Number.isFinite(ts)) return 'STALE'

  const ageSec = (Date.now() - ts) / 1_000

  if (ageSec <= TRACKING_THRESHOLDS.LIVE_FRESH_MAX_S) return 'LIVE'
  if (ageSec <= TRACKING_THRESHOLDS.LIVE_AGING_MAX_S) return 'AGING'
  if (ageSec <= TRACKING_THRESHOLDS.LIVE_SESSION_EXPIRES_MIN * 60) return 'STALE'
  return 'EXPIRED'
}

/**
 * Resolve freshness state for a fan sighting using spec-canonical names.
 *
 * @param createdAt  ISO string or Date of the sighting.
 */
export function getSightingFreshness(createdAt: string | Date): SightingFreshnessState {
  const ts = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime()
  if (!Number.isFinite(ts)) return 'EXPIRED_SIGHTING'

  const ageMin = (Date.now() - ts) / 60_000

  if (ageMin <= TRACKING_THRESHOLDS.SIGHTING_FRESH_MAX_MIN) return 'FRESH_SIGHTING'
  if (ageMin <= TRACKING_THRESHOLDS.SIGHTING_EXPIRES_MIN) return 'AGING_SIGHTING'
  return 'EXPIRED_SIGHTING'
}

/**
 * Map a spec LiveSessionFreshnessState to the TrackingSignalType used by
 * existing UI components (markers, badges, overlays).
 *
 * AGING → ESTIMATED (same visual treatment — amber, no pulse)
 */
export function liveSessionFreshnessToSignalType(
  freshness: LiveSessionFreshnessState,
): TrackingSignalType {
  switch (freshness) {
    case 'LIVE': return 'LIVE'
    case 'AGING': return 'ESTIMATED'
    case 'STALE': return 'STALE'
    case 'EXPIRED': return 'EXPIRED'
  }
}

/**
 * Map a spec SightingFreshnessState to the TrackingSignalType used by
 * existing UI components.
 *
 * FRESH_SIGHTING → ESTIMATED (usable, amber)
 * AGING_SIGHTING → STALE     (last-known, grey)
 * EXPIRED_SIGHTING → EXPIRED (hidden)
 */
export function sightingFreshnessToSignalType(
  freshness: SightingFreshnessState,
): TrackingSignalType {
  switch (freshness) {
    case 'FRESH_SIGHTING': return 'ESTIMATED'
    case 'AGING_SIGHTING': return 'STALE'
    case 'EXPIRED_SIGHTING': return 'EXPIRED'
  }
}

/**
 * Get the marker visual state for a live session row from v_live_now.
 * Accepts the server-computed `freshness_state` string directly.
 *
 * @param freshnessState  Value of v_live_now.freshness_state ('LIVE'|'AGING'|'STALE')
 */
export function getMarkerVisualState(
  freshnessState: string | null | undefined,
): TrackingSignalType {
  switch (freshnessState) {
    case 'LIVE': return 'LIVE'
    case 'AGING': return 'ESTIMATED'
    case 'STALE': return 'STALE'
    default: return 'STALE'
  }
}

/**
 * Get tracking copy for a live session row from v_live_now.
 * Thin wrapper over getTrackingCalloutCopy that accepts the server freshness_state.
 */
export function getTrackingCopy(
  freshnessState: string | null | undefined,
  ageSec: number,
  lastStageName?: string | null,
): TrackingCalloutCopy {
  return getTrackingCalloutCopy(getMarkerVisualState(freshnessState), ageSec, lastStageName)
}

// ─── Freshness age helpers ────────────────────────────────────────────────────

/** Seconds since the given timestamp. Returns Infinity for invalid dates. */
export function getAgeSeconds(ts: string | Date): number {
  const t = ts instanceof Date ? ts.getTime() : new Date(ts).getTime()
  if (!Number.isFinite(t)) return Infinity
  return Math.max(0, Math.floor((Date.now() - t) / 1_000))
}

/** Minutes since the given timestamp. Returns Infinity for invalid dates. */
export function getAgeMinutes(ts: string | Date): number {
  return getAgeSeconds(ts) / 60
}

// ─── Human-readable copy ─────────────────────────────────────────────────────

/**
 * Format a freshness age as a compact human-readable string.
 * e.g. "12s ago", "4m ago", "1h ago"
 */
export function formatAgeShort(ageSec: number): string {
  if (ageSec < 60) return `${ageSec}s ago`
  const mins = Math.floor(ageSec / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

// ─── Marker visual config ─────────────────────────────────────────────────────

export interface MarkerVisualConfig {
  /** Ring / border colour */
  ring: string
  /** Box-shadow glow */
  glow: string
  /** Overall marker opacity */
  opacity: number
  /** Whether to show the live pulse halo */
  pulse: boolean
  /** Whether to show the motion trail arc */
  trail: boolean
  /** Ring border width (px) */
  ringWidth: number
  /** Whether to render a dashed outer ring (stale indicator) */
  dashedRing: boolean
}

export const MARKER_VISUAL: Record<TrackingSignalType, MarkerVisualConfig> = {
  LIVE: {
    ring: '#22c55e',
    glow: '0 0 0 1px #22c55e, 0 4px 16px rgba(34,197,94,0.55), 0 2px 6px rgba(0,0,0,0.35)',
    opacity: 1,
    pulse: true,
    trail: true,
    ringWidth: 3,
    dashedRing: false,
  },
  ESTIMATED: {
    ring: '#f59e0b',
    glow: '0 0 0 1px #f59e0b, 0 4px 12px rgba(245,158,11,0.4), 0 2px 6px rgba(0,0,0,0.3)',
    opacity: 1,
    pulse: false,
    trail: false,
    ringWidth: 3,
    dashedRing: false,
  },
  STALE: {
    ring: '#6b7280',
    glow: '0 2px 8px rgba(0,0,0,0.25)',
    opacity: 0.45,
    pulse: false,
    trail: false,
    ringWidth: 2,
    dashedRing: true,
  },
  // EXPIRED markers are never rendered — this config is a safety fallback only.
  EXPIRED: {
    ring: '#374151',
    glow: 'none',
    opacity: 0,
    pulse: false,
    trail: false,
    ringWidth: 1,
    dashedRing: false,
  },
}

/**
 * Marker visual config keyed by spec LiveSessionFreshnessState.
 * AGING maps to the same amber style as ESTIMATED — softer than LIVE, no pulse.
 * Use this when consuming v_live_now.freshness_state directly.
 */
export const MARKER_VISUAL_BY_FRESHNESS: Record<LiveSessionFreshnessState, MarkerVisualConfig> = {
  LIVE: MARKER_VISUAL.LIVE,
  AGING: MARKER_VISUAL.ESTIMATED,   // amber ring, no pulse — softer than LIVE
  STALE: MARKER_VISUAL.STALE,
  EXPIRED: MARKER_VISUAL.EXPIRED,
}

// ─── Route line visual config ─────────────────────────────────────────────────

export interface RouteLineVisualConfig {
  /** Main line colour */
  color: string
  /** Line opacity */
  opacity: number
  /** Shadow layer opacity */
  shadowOpacity: number
  /** MapLibre dasharray — null = solid */
  dasharray: number[] | null
}

export const ROUTE_LINE_VISUAL: Record<TrackingSignalType, RouteLineVisualConfig> = {
  LIVE: {
    color: '#ff2d78',
    opacity: 0.95,
    shadowOpacity: 0.9,
    dasharray: null,
  },
  ESTIMATED: {
    color: '#ff2d78',
    opacity: 0.65,
    shadowOpacity: 0.5,
    dasharray: [6, 4],
  },
  STALE: {
    color: '#6b7280',
    opacity: 0.4,
    shadowOpacity: 0.2,
    dasharray: [4, 6],
  },
  EXPIRED: {
    color: '#374151',
    opacity: 0,
    shadowOpacity: 0,
    dasharray: null,
  },
}

// ─── Callout copy ─────────────────────────────────────────────────────────────

export interface TrackingCalloutCopy {
  /** Primary status line shown at the top of the callout */
  statusLine: string
  /** Secondary detail line */
  detailLine: string | null
  /** Warning/disclaimer shown for stale/expired */
  disclaimer: string | null
  /** Primary CTA label */
  primaryAction: string
  /** Secondary CTA label (optional) */
  secondaryAction: string | null
  /** Whether to show ETA prominently */
  showEtaProminent: boolean
  /** ETA label prefix */
  etaPrefix: string
}

export function getTrackingCalloutCopy(
  signalType: TrackingSignalType,
  ageSec: number,
  lastStageName?: string | null,
): TrackingCalloutCopy {
  const ageLabel = formatAgeShort(ageSec)

  switch (signalType) {
    case 'LIVE':
      return {
        statusLine: 'Live now',
        detailLine: null,
        disclaimer: null,
        primaryAction: 'Track',
        secondaryAction: null,
        showEtaProminent: true,
        etaPrefix: 'ETA',
      }

    case 'ESTIMATED':
      return {
        statusLine: 'Estimated position',
        detailLine: `Last sighting · ${ageLabel}`,
        disclaimer: null,
        primaryAction: 'Track with estimate',
        secondaryAction: 'Find alternatives',
        showEtaProminent: true,
        etaPrefix: '~',
      }

    case 'STALE':
      return {
        statusLine: lastStageName
          ? `Last active near ${lastStageName}`
          : `Last active · ${ageLabel}`,
        detailLine: lastStageName ? `Updated ${ageLabel}` : null,
        disclaimer: 'Signal may no longer be accurate',
        primaryAction: 'Find alternatives',
        secondaryAction: 'View last known',
        showEtaProminent: false,
        etaPrefix: '~',
      }

    case 'EXPIRED':
      return {
        statusLine: 'Signal expired',
        detailLine: `Last seen ${ageLabel}`,
        disclaimer: 'This signal has expired.',
        primaryAction: 'Find alternatives',
        secondaryAction: null,
        showEtaProminent: false,
        etaPrefix: '',
      }
  }
}

// ─── ETA display helpers ──────────────────────────────────────────────────────

/**
 * Format an ETA value for display, qualified by signal state.
 * Returns null when ETA should not be shown (EXPIRED).
 */
export function formatEtaLabel(
  etaMinutes: number,
  signalType: TrackingSignalType,
): string | null {
  switch (signalType) {
    case 'LIVE':
      return `ETA ${etaMinutes} min`
    case 'ESTIMATED':
      return `~${etaMinutes} min estimate`
    case 'STALE':
      return `~${etaMinutes} min old estimate`
    case 'EXPIRED':
      return null
  }
}

// ─── Live count helpers ───────────────────────────────────────────────────────

/**
 * Whether a signal state counts as "live now" for display purposes.
 * STALE and EXPIRED must never inflate live counts.
 */
export function isLiveForCount(signalType: TrackingSignalType): boolean {
  return signalType === 'LIVE'
}

/**
 * Whether a signal state should be shown on the live tracking map at all.
 * EXPIRED signals are hidden from live surfaces.
 */
export function isVisibleOnLiveMap(signalType: TrackingSignalType): boolean {
  return signalType !== 'EXPIRED'
}

// ─── Ranking priority ─────────────────────────────────────────────────────────

/**
 * Numeric sort priority for signal states (lower = higher priority).
 * Used to rank nganyas in lists and recommendations.
 *
 *  1 → LIVE (fresh GPS)
 *  2 → ESTIMATED (sightings / aging GPS)
 *  3 → STALE (last-known)
 *  4 → EXPIRED (hidden)
 */
export const SIGNAL_RANK: Record<TrackingSignalType, number> = {
  LIVE: 1,
  ESTIMATED: 2,
  STALE: 3,
  EXPIRED: 4,
}
