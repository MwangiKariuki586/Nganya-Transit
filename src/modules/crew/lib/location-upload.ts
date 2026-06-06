/**
 * Location Upload Helpers — pure functions for adaptive upload decisions.
 *
 * All upload thresholds live here. Never inline these numbers elsewhere.
 *
 * Upload decision model:
 *
 *   Upload when ANY of the following is true:
 *     - crew moved >= MOVEMENT_THRESHOLD_M metres since last upload
 *     - FOREGROUND_MAX_INTERVAL_MS has elapsed since last upload (heartbeat)
 *     - app just recovered from backgrounded/offline state
 *     - session just started (first upload)
 *     - session is ending (final upload)
 *     - speed changed by >= SPEED_CHANGE_THRESHOLD_MPS (if available)
 *     - heading changed by >= HEADING_CHANGE_THRESHOLD_DEG (if available)
 *
 *   Never upload when:
 *     - accuracy is worse than ACCURACY_REJECT_THRESHOLD_M
 *     - position is identical to last uploaded position
 *     - location readiness is not 'granted'
 */

import type { CrewLocationPosition } from '../hooks/useCrewLocationRuntime'

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const UPLOAD_THRESHOLDS = {
  /** Minimum movement in metres before uploading (avoids GPS jitter noise) */
  MOVEMENT_THRESHOLD_M: 100,

  /** Maximum time between uploads while in foreground (ms) */
  FOREGROUND_MAX_INTERVAL_MS: 28_000,

  /** Maximum time between uploads while idle / stationary (ms) */
  IDLE_MAX_INTERVAL_MS: 90_000,

  /** Reject fixes with accuracy worse than this (metres) */
  ACCURACY_REJECT_THRESHOLD_M: 200,

  /** Speed change that triggers an upload regardless of distance (m/s) */
  SPEED_CHANGE_THRESHOLD_MPS: 3,

  /** Heading change that triggers an upload regardless of distance (degrees) */
  HEADING_CHANGE_THRESHOLD_DEG: 30,
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

/** Normalised payload sent to the ingestion layer. */
export interface LocationUploadPayload {
  lat: number
  lng: number
  accuracy_m: number | null
  speed_mps: number | null
  heading: number | null
  captured_at: string
}

export type ClientState = 'foreground' | 'backgrounded' | 'recovered' | 'offline'

export interface ShouldUploadParams {
  current: CrewLocationPosition
  lastUploaded: CrewLocationPosition | null
  lastUploadedAt: number | null
  clientState: ClientState
  isFirstUpload: boolean
  isFinalUpload: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Haversine distance between two lat/lng points, in metres.
 */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000 // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180

  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinDLat * sinDLat +
          Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng,
      ),
    )

  return R * c
}

/**
 * Absolute angular difference between two headings (0–180 degrees).
 */
function headingDelta(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

/**
 * Decide whether the current position warrants an upload.
 *
 * Returns `{ should: true, reason }` when an upload is warranted,
 * or `{ should: false, reason }` when it should be skipped.
 */
export function shouldUploadLocation(params: ShouldUploadParams): {
  should: boolean
  reason: string
} {
  const {
    current,
    lastUploaded,
    lastUploadedAt,
    clientState,
    isFirstUpload,
    isFinalUpload,
  } = params

  // Always upload on session start or end
  if (isFirstUpload) return { should: true, reason: 'first_upload' }
  if (isFinalUpload) return { should: true, reason: 'final_upload' }

  // Reject unusable accuracy
  if (
    current.accuracy !== null &&
    current.accuracy > UPLOAD_THRESHOLDS.ACCURACY_REJECT_THRESHOLD_M
  ) {
    return { should: false, reason: 'accuracy_too_poor' }
  }

  // Always upload on recovery from background/offline
  if (clientState === 'recovered') return { should: true, reason: 'recovered' }

  const now = Date.now()
  const timeSinceLastMs = lastUploadedAt !== null ? now - lastUploadedAt : Infinity

  // Foreground heartbeat — upload at least every FOREGROUND_MAX_INTERVAL_MS
  if (timeSinceLastMs >= UPLOAD_THRESHOLDS.FOREGROUND_MAX_INTERVAL_MS) {
    return { should: true, reason: 'heartbeat_interval' }
  }

  // No previous upload to compare against — upload now
  if (!lastUploaded) return { should: true, reason: 'no_previous_position' }

  // Movement threshold
  const moved = distanceMeters(lastUploaded, current)
  if (moved >= UPLOAD_THRESHOLDS.MOVEMENT_THRESHOLD_M) {
    return { should: true, reason: 'moved' }
  }

  // Speed change (if both positions have speed data)
  if (current.speed !== null && lastUploaded.speed !== null) {
    const speedDelta = Math.abs(current.speed - lastUploaded.speed)
    if (speedDelta >= UPLOAD_THRESHOLDS.SPEED_CHANGE_THRESHOLD_MPS) {
      return { should: true, reason: 'speed_change' }
    }
  }

  // Heading change (if both positions have heading data)
  if (current.heading !== null && lastUploaded.heading !== null) {
    const hDelta = headingDelta(current.heading, lastUploaded.heading)
    if (hDelta >= UPLOAD_THRESHOLDS.HEADING_CHANGE_THRESHOLD_DEG) {
      return { should: true, reason: 'heading_change' }
    }
  }

  return { should: false, reason: 'no_change' }
}

/**
 * Normalise a CrewLocationPosition into the upload payload shape.
 * This is the shape the ingestion layer (Unit 03 Edge Function) will expect.
 */
export function normalizeLocationPayload(
  position: CrewLocationPosition,
): LocationUploadPayload {
  return {
    lat: position.lat,
    lng: position.lng,
    accuracy_m: position.accuracy,
    speed_mps: position.speed,
    heading: position.heading,
    captured_at: new Date(position.capturedAt).toISOString(),
  }
}
