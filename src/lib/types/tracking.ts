import type { ConfidenceLevel, JourneyResult, JourneySource } from './journey'

// ─── Freshness thresholds ────────────────────────────────────────────────────

/** All timing constants in one place — never inline magic numbers. */
export const TRACKING_THRESHOLDS = {
  /** Live GPS ping considered fresh (seconds) */
  LIVE_FRESH_MAX_S: 30,
  /** Live GPS ping still usable but aging (seconds) */
  LIVE_AGING_MAX_S: 90,
  /** Live session too old to show on live map surfaces (minutes) */
  LIVE_SESSION_EXPIRES_MIN: 15,
  /** Sighting still fresh for live intel (minutes) */
  SIGHTING_FRESH_MAX_MIN: 10,
  /** Sighting still usable for live intel (minutes) */
  SIGHTING_USABLE_MAX_MIN: 30,
  /** Sighting too old to show on live map surfaces (minutes) */
  SIGHTING_EXPIRES_MIN: 30,
  /** ETA tick interval (ms) */
  ETA_TICK_MS: 15_000,
  /** Walk speed used for time estimation (metres per minute) */
  WALK_SPEED_MPM: 80,
  /** Buffer subtracted when computing "leave now" threshold (minutes) */
  LEAVE_BUFFER_MIN: 2,
} as const

// ─── Signal source state ─────────────────────────────────────────────────────

/**
 * Resolved signal state after applying freshness rules.
 *
 * - LIVE      → crew GPS, fresh ping ≤ LIVE_FRESH_MAX_S (≤30 s)
 * - ESTIMATED → sightings-based OR aging live ping (31–90 s)
 * - STALE     → last update > LIVE_AGING_MAX_S or sighting > SIGHTING_FRESH_MAX_MIN
 *               Show as last-known location only. No live pulse, no ETA.
 * - EXPIRED   → last update > LIVE_SESSION_EXPIRES_MIN or sighting > SIGHTING_EXPIRES_MIN
 *               Do NOT render on live map surfaces.
 */
export type TrackingSignalType = 'LIVE' | 'ESTIMATED' | 'STALE' | 'EXPIRED'

// ─── Catchability ────────────────────────────────────────────────────────────

/**
 * Whether the user can realistically board this nganya.
 * Considers ETA, walk time, signal freshness and confidence.
 */
export type CatchabilityStatus =
  | 'CATCHABLE'
  | 'RISKY'
  | 'TOO_FAR'
  | 'STALE_UNCERTAIN'

export interface CatchabilityResult {
  status: CatchabilityStatus
  label: string
  subtext: string
}

// ─── Position ────────────────────────────────────────────────────────────────

export interface TrackingPosition {
  lat: number
  lng: number
}

// ─── Full tracking payload ───────────────────────────────────────────────────

/**
 * Enriched payload that powers the map-first tracking experience.
 * Derived from JourneyResult + position lookups + local computation.
 */
export interface TrackingPayload {
  // Identity
  nganya_id: string
  nganya_name: string
  corridor_id: string
  corridor_name: string
  direction: string | null

  // Signal
  source_type: TrackingSignalType
  raw_source: JourneySource
  confidence_level: ConfidenceLevel
  freshness_seconds: number
  last_update_at: Date

  // Positions (null when unavailable)
  nganya_position: TrackingPosition | null
  pickup_stage_position: TrackingPosition | null
  user_position: TrackingPosition | null

  // ETA
  eta_minutes: number

  // Stage context
  last_stage_name: string | null
  stages_away: number | null

  // Catchability (derived)
  catchability: CatchabilityResult

  // User walk
  walk_time_minutes: number | null

  // Plan B
  alternatives: JourneyResult[]
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export type TrackingFeedbackAction = 'BOARDED' | 'MISSED'

export type FeedbackState = 'idle' | 'submitting' | 'boarded' | 'missed' | 'error'

// ─── Bottom sheet snap state ─────────────────────────────────────────────────

export type SheetSnapState = 'collapsed' | 'half' | 'expanded'
