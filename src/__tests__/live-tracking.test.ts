/**
 * Live Tracking — Unit 07: Automated helper tests
 *
 * Tests the pure helper functions introduced across Units 01–06.
 * No browser APIs, no React, no network calls — all functions are
 * deterministic given a controlled clock.
 *
 * Coverage:
 *   - distanceMeters()           (location-upload.ts)
 *   - shouldUploadLocation()     (location-upload.ts)
 *   - getLiveSessionFreshness()  (tracking-signal.ts)
 *   - getSightingFreshness()     (tracking-signal.ts)
 *   - liveSessionFreshnessToSignalType()  (tracking-signal.ts)
 *   - sightingFreshnessToSignalType()     (tracking-signal.ts)
 *   - getMarkerVisualState()     (tracking-signal.ts)
 *   - MARKER_VISUAL config       (tracking-signal.ts)
 *   - getTrackingCalloutCopy()   (tracking-signal.ts)
 *   - isLiveForCount()           (tracking-signal.ts)
 *   - isVisibleOnLiveMap()       (tracking-signal.ts)
 *   - formatAgeShort()           (tracking-signal.ts)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  distanceMeters,
  shouldUploadLocation,
  UPLOAD_THRESHOLDS,
  type ShouldUploadParams,
} from '@/modules/crew/lib/location-upload'

import {
  getLiveSessionFreshness,
  getSightingFreshness,
  liveSessionFreshnessToSignalType,
  sightingFreshnessToSignalType,
  getMarkerVisualState,
  getTrackingCalloutCopy,
  isLiveForCount,
  isVisibleOnLiveMap,
  formatAgeShort,
  MARKER_VISUAL,
} from '@/lib/tracking-signal'

import { TRACKING_THRESHOLDS } from '@/lib/types/tracking'
import type { CrewLocationPosition } from '@/modules/crew/hooks/useCrewLocationRuntime'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal CrewLocationPosition for test use. */
function pos(
  lat: number,
  lng: number,
  overrides: Partial<CrewLocationPosition> = {},
): CrewLocationPosition {
  return {
    lat,
    lng,
    accuracy: 15,
    heading: null,
    speed: null,
    capturedAt: Date.now(),
    ...overrides,
  }
}

/** ISO timestamp N seconds in the past. */
function secsAgo(n: number): string {
  return new Date(Date.now() - n * 1_000).toISOString()
}

/** ISO timestamp N minutes in the past. */
function minsAgo(n: number): string {
  return secsAgo(n * 60)
}

// ─── distanceMeters ───────────────────────────────────────────────────────────

describe('distanceMeters', () => {
  it('returns 0 for identical points', () => {
    expect(distanceMeters({ lat: -1.29, lng: 36.82 }, { lat: -1.29, lng: 36.82 })).toBe(0)
  })

  it('returns ~111 km per degree of latitude', () => {
    const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })

  it('returns ~111 km per degree of longitude at equator', () => {
    const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })

  it('is symmetric', () => {
    const a = { lat: -1.29, lng: 36.82 }
    const b = { lat: -1.30, lng: 36.85 }
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 0)
  })

  it('returns a value above MOVEMENT_THRESHOLD_M for a 200 m move', () => {
    // ~200 m north of Nairobi CBD
    const a = { lat: -1.2921, lng: 36.8219 }
    const b = { lat: -1.2903, lng: 36.8219 } // ~200 m north
    expect(distanceMeters(a, b)).toBeGreaterThan(UPLOAD_THRESHOLDS.MOVEMENT_THRESHOLD_M)
  })

  it('returns a value below MOVEMENT_THRESHOLD_M for a 10 m move', () => {
    const a = { lat: -1.2921, lng: 36.8219 }
    const b = { lat: -1.29219, lng: 36.8219 } // ~10 m north
    expect(distanceMeters(a, b)).toBeLessThan(UPLOAD_THRESHOLDS.MOVEMENT_THRESHOLD_M)
  })
})

// ─── shouldUploadLocation ─────────────────────────────────────────────────────

describe('shouldUploadLocation', () => {
  const nairobi = pos(-1.2921, 36.8219)

  // Base params that represent a normal foreground state with a recent upload
  function baseParams(overrides: Partial<ShouldUploadParams> = {}): ShouldUploadParams {
    return {
      current: nairobi,
      lastUploaded: nairobi,
      lastUploadedAt: Date.now() - 5_000, // 5 s ago
      clientState: 'foreground',
      isFirstUpload: false,
      isFinalUpload: false,
      ...overrides,
    }
  }

  it('always uploads on first upload', () => {
    const result = shouldUploadLocation(baseParams({ isFirstUpload: true }))
    expect(result.should).toBe(true)
    expect(result.reason).toBe('first_upload')
  })

  it('always uploads on final upload', () => {
    const result = shouldUploadLocation(baseParams({ isFinalUpload: true }))
    expect(result.should).toBe(true)
    expect(result.reason).toBe('final_upload')
  })

  it('always uploads on recovery', () => {
    const result = shouldUploadLocation(baseParams({ clientState: 'recovered' }))
    expect(result.should).toBe(true)
    expect(result.reason).toBe('recovered')
  })

  it('rejects when accuracy is too poor', () => {
    const result = shouldUploadLocation(
      baseParams({
        current: pos(-1.2921, 36.8219, {
          accuracy: UPLOAD_THRESHOLDS.ACCURACY_REJECT_THRESHOLD_M + 1,
        }),
      }),
    )
    expect(result.should).toBe(false)
    expect(result.reason).toBe('accuracy_too_poor')
  })

  it('accepts when accuracy is exactly at the threshold', () => {
    // Exactly at threshold is not > threshold, so it should not be rejected
    const result = shouldUploadLocation(
      baseParams({
        current: pos(-1.2921, 36.8219, {
          accuracy: UPLOAD_THRESHOLDS.ACCURACY_REJECT_THRESHOLD_M,
        }),
      }),
    )
    // Should not be rejected for accuracy — may be rejected for no_change
    expect(result.reason).not.toBe('accuracy_too_poor')
  })

  it('uploads when foreground heartbeat interval has elapsed', () => {
    const result = shouldUploadLocation(
      baseParams({
        lastUploadedAt: Date.now() - UPLOAD_THRESHOLDS.FOREGROUND_MAX_INTERVAL_MS - 1_000,
      }),
    )
    expect(result.should).toBe(true)
    expect(result.reason).toBe('heartbeat_interval')
  })

  it('does not upload when stationary and within heartbeat interval', () => {
    const result = shouldUploadLocation(baseParams())
    expect(result.should).toBe(false)
    expect(result.reason).toBe('no_change')
  })

  it('uploads when crew has moved beyond movement threshold', () => {
    const moved = pos(-1.2903, 36.8219) // ~200 m north
    const result = shouldUploadLocation(baseParams({ current: moved }))
    expect(result.should).toBe(true)
    expect(result.reason).toBe('moved')
  })

  it('does not upload for tiny GPS jitter (< movement threshold)', () => {
    const jitter = pos(-1.29211, 36.8219) // ~1 m
    const result = shouldUploadLocation(baseParams({ current: jitter }))
    expect(result.should).toBe(false)
  })

  it('uploads when speed changes significantly', () => {
    const fastPos = pos(-1.2921, 36.8219, { speed: 15 })
    const result = shouldUploadLocation(
      baseParams({
        current: fastPos,
        lastUploaded: pos(-1.2921, 36.8219, { speed: 1 }),
      }),
    )
    expect(result.should).toBe(true)
    expect(result.reason).toBe('speed_change')
  })

  it('uploads when heading changes significantly', () => {
    const turnedPos = pos(-1.2921, 36.8219, { heading: 180 })
    const result = shouldUploadLocation(
      baseParams({
        current: turnedPos,
        lastUploaded: pos(-1.2921, 36.8219, { heading: 0 }),
      }),
    )
    expect(result.should).toBe(true)
    expect(result.reason).toBe('heading_change')
  })

  it('does not upload for small heading change', () => {
    const slightTurn = pos(-1.2921, 36.8219, { heading: 10 })
    const result = shouldUploadLocation(
      baseParams({
        current: slightTurn,
        lastUploaded: pos(-1.2921, 36.8219, { heading: 0 }),
      }),
    )
    expect(result.should).toBe(false)
  })

  it('uploads when there is no previous position', () => {
    const result = shouldUploadLocation(baseParams({ lastUploaded: null }))
    expect(result.should).toBe(true)
    expect(result.reason).toBe('no_previous_position')
  })

  it('uploads when lastUploadedAt is null (never uploaded)', () => {
    const result = shouldUploadLocation(baseParams({ lastUploadedAt: null }))
    expect(result.should).toBe(true)
    expect(result.reason).toBe('heartbeat_interval')
  })
})

// ─── getLiveSessionFreshness ──────────────────────────────────────────────────

describe('getLiveSessionFreshness', () => {
  it('returns LIVE for a ping within 30 s', () => {
    expect(getLiveSessionFreshness(secsAgo(10))).toBe('LIVE')
    expect(getLiveSessionFreshness(secsAgo(30))).toBe('LIVE')
  })

  it('returns AGING for a ping between 31 and 90 s', () => {
    expect(getLiveSessionFreshness(secsAgo(31))).toBe('AGING')
    expect(getLiveSessionFreshness(secsAgo(60))).toBe('AGING')
    expect(getLiveSessionFreshness(secsAgo(90))).toBe('AGING')
  })

  it('returns STALE for a ping between 91 s and 15 min', () => {
    expect(getLiveSessionFreshness(secsAgo(91))).toBe('STALE')
    expect(getLiveSessionFreshness(minsAgo(5))).toBe('STALE')
    expect(getLiveSessionFreshness(minsAgo(14))).toBe('STALE')
  })

  it('returns EXPIRED for a ping older than 15 min', () => {
    expect(getLiveSessionFreshness(minsAgo(16))).toBe('EXPIRED')
    expect(getLiveSessionFreshness(minsAgo(30))).toBe('EXPIRED')
    expect(getLiveSessionFreshness(minsAgo(60))).toBe('EXPIRED')
  })

  it('returns STALE for an invalid timestamp', () => {
    expect(getLiveSessionFreshness('not-a-date')).toBe('STALE')
    expect(getLiveSessionFreshness('')).toBe('STALE')
  })

  it('accepts a Date object', () => {
    expect(getLiveSessionFreshness(new Date(Date.now() - 10_000))).toBe('LIVE')
    expect(getLiveSessionFreshness(new Date(Date.now() - 200_000))).toBe('STALE')
  })

  it('thresholds match TRACKING_THRESHOLDS constants', () => {
    // Boundary: exactly at LIVE_FRESH_MAX_S
    expect(getLiveSessionFreshness(secsAgo(TRACKING_THRESHOLDS.LIVE_FRESH_MAX_S))).toBe('LIVE')
    // One second past: AGING
    expect(getLiveSessionFreshness(secsAgo(TRACKING_THRESHOLDS.LIVE_FRESH_MAX_S + 1))).toBe('AGING')
    // Boundary: exactly at LIVE_AGING_MAX_S
    expect(getLiveSessionFreshness(secsAgo(TRACKING_THRESHOLDS.LIVE_AGING_MAX_S))).toBe('AGING')
    // One second past: STALE
    expect(getLiveSessionFreshness(secsAgo(TRACKING_THRESHOLDS.LIVE_AGING_MAX_S + 1))).toBe('STALE')
  })
})

// ─── getSightingFreshness ─────────────────────────────────────────────────────

describe('getSightingFreshness', () => {
  it('returns FRESH_SIGHTING for a sighting within 10 min', () => {
    expect(getSightingFreshness(minsAgo(1))).toBe('FRESH_SIGHTING')
    expect(getSightingFreshness(minsAgo(9))).toBe('FRESH_SIGHTING')
    expect(getSightingFreshness(minsAgo(10))).toBe('FRESH_SIGHTING')
  })

  it('returns AGING_SIGHTING for a sighting between 10 and 30 min', () => {
    expect(getSightingFreshness(minsAgo(11))).toBe('AGING_SIGHTING')
    expect(getSightingFreshness(minsAgo(20))).toBe('AGING_SIGHTING')
    expect(getSightingFreshness(minsAgo(30))).toBe('AGING_SIGHTING')
  })

  it('returns EXPIRED_SIGHTING for a sighting older than 30 min', () => {
    expect(getSightingFreshness(minsAgo(31))).toBe('EXPIRED_SIGHTING')
    expect(getSightingFreshness(minsAgo(60))).toBe('EXPIRED_SIGHTING')
  })

  it('returns EXPIRED_SIGHTING for an invalid timestamp', () => {
    expect(getSightingFreshness('bad')).toBe('EXPIRED_SIGHTING')
  })

  it('thresholds match TRACKING_THRESHOLDS constants', () => {
    expect(getSightingFreshness(minsAgo(TRACKING_THRESHOLDS.SIGHTING_FRESH_MAX_MIN))).toBe('FRESH_SIGHTING')
    expect(getSightingFreshness(minsAgo(TRACKING_THRESHOLDS.SIGHTING_FRESH_MAX_MIN + 1))).toBe('AGING_SIGHTING')
    expect(getSightingFreshness(minsAgo(TRACKING_THRESHOLDS.SIGHTING_EXPIRES_MIN))).toBe('AGING_SIGHTING')
    expect(getSightingFreshness(minsAgo(TRACKING_THRESHOLDS.SIGHTING_EXPIRES_MIN + 1))).toBe('EXPIRED_SIGHTING')
  })
})

// ─── liveSessionFreshnessToSignalType ─────────────────────────────────────────

describe('liveSessionFreshnessToSignalType', () => {
  it('maps LIVE → LIVE', () => {
    expect(liveSessionFreshnessToSignalType('LIVE')).toBe('LIVE')
  })

  it('maps AGING → ESTIMATED (same amber visual)', () => {
    expect(liveSessionFreshnessToSignalType('AGING')).toBe('ESTIMATED')
  })

  it('maps STALE → STALE', () => {
    expect(liveSessionFreshnessToSignalType('STALE')).toBe('STALE')
  })

  it('maps EXPIRED → EXPIRED', () => {
    expect(liveSessionFreshnessToSignalType('EXPIRED')).toBe('EXPIRED')
  })
})

// ─── sightingFreshnessToSignalType ────────────────────────────────────────────

describe('sightingFreshnessToSignalType', () => {
  it('maps FRESH_SIGHTING → ESTIMATED', () => {
    expect(sightingFreshnessToSignalType('FRESH_SIGHTING')).toBe('ESTIMATED')
  })

  it('maps AGING_SIGHTING → STALE', () => {
    expect(sightingFreshnessToSignalType('AGING_SIGHTING')).toBe('STALE')
  })

  it('maps EXPIRED_SIGHTING → EXPIRED', () => {
    expect(sightingFreshnessToSignalType('EXPIRED_SIGHTING')).toBe('EXPIRED')
  })
})

// ─── getMarkerVisualState ─────────────────────────────────────────────────────

describe('getMarkerVisualState', () => {
  it('maps server "LIVE" → LIVE signal type', () => {
    expect(getMarkerVisualState('LIVE')).toBe('LIVE')
  })

  it('maps server "AGING" → ESTIMATED signal type', () => {
    expect(getMarkerVisualState('AGING')).toBe('ESTIMATED')
  })

  it('maps server "STALE" → STALE signal type', () => {
    expect(getMarkerVisualState('STALE')).toBe('STALE')
  })

  it('defaults to STALE for unknown/null values', () => {
    expect(getMarkerVisualState(null)).toBe('STALE')
    expect(getMarkerVisualState(undefined)).toBe('STALE')
    expect(getMarkerVisualState('UNKNOWN')).toBe('STALE')
  })
})

// ─── MARKER_VISUAL config ─────────────────────────────────────────────────────

describe('MARKER_VISUAL', () => {
  it('LIVE marker has pulse and trail enabled', () => {
    expect(MARKER_VISUAL.LIVE.pulse).toBe(true)
    expect(MARKER_VISUAL.LIVE.trail).toBe(true)
  })

  it('ESTIMATED marker has no pulse and no trail', () => {
    expect(MARKER_VISUAL.ESTIMATED.pulse).toBe(false)
    expect(MARKER_VISUAL.ESTIMATED.trail).toBe(false)
  })

  it('STALE marker has no pulse, no trail, and a dashed ring', () => {
    expect(MARKER_VISUAL.STALE.pulse).toBe(false)
    expect(MARKER_VISUAL.STALE.trail).toBe(false)
    expect(MARKER_VISUAL.STALE.dashedRing).toBe(true)
  })

  it('STALE marker has reduced opacity', () => {
    expect(MARKER_VISUAL.STALE.opacity).toBeLessThan(MARKER_VISUAL.LIVE.opacity)
    expect(MARKER_VISUAL.STALE.opacity).toBeLessThan(MARKER_VISUAL.ESTIMATED.opacity)
  })

  it('EXPIRED marker has zero opacity (never rendered)', () => {
    expect(MARKER_VISUAL.EXPIRED.opacity).toBe(0)
    expect(MARKER_VISUAL.EXPIRED.pulse).toBe(false)
  })

  it('LIVE ring is green', () => {
    expect(MARKER_VISUAL.LIVE.ring).toMatch(/^#[0-9a-f]{6}$/i)
    // Green channel should dominate
    const hex = MARKER_VISUAL.LIVE.ring.slice(1)
    const g = parseInt(hex.slice(2, 4), 16)
    const r = parseInt(hex.slice(0, 2), 16)
    expect(g).toBeGreaterThan(r)
  })

  it('STALE ring is grey (R ≈ G ≈ B)', () => {
    const hex = MARKER_VISUAL.STALE.ring.slice(1)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    expect(Math.abs(r - g)).toBeLessThan(20)
    expect(Math.abs(g - b)).toBeLessThan(20)
  })
})

// ─── getTrackingCalloutCopy ───────────────────────────────────────────────────

describe('getTrackingCalloutCopy', () => {
  it('LIVE copy shows ETA prominently and says "Live now"', () => {
    const copy = getTrackingCalloutCopy('LIVE', 10)
    expect(copy.statusLine).toBe('Live now')
    expect(copy.showEtaProminent).toBe(true)
    expect(copy.disclaimer).toBeNull()
  })

  it('ESTIMATED copy shows ETA with ~ prefix', () => {
    const copy = getTrackingCalloutCopy('ESTIMATED', 300)
    expect(copy.etaPrefix).toBe('~')
    expect(copy.showEtaProminent).toBe(true)
  })

  it('STALE copy does not show ETA prominently', () => {
    const copy = getTrackingCalloutCopy('STALE', 200)
    expect(copy.showEtaProminent).toBe(false)
    expect(copy.disclaimer).not.toBeNull()
  })

  it('STALE copy says "Last active" — never "Live" or "arriving"', () => {
    const copy = getTrackingCalloutCopy('STALE', 200)
    expect(copy.statusLine.toLowerCase()).toContain('last active')
    expect(copy.statusLine.toLowerCase()).not.toContain('live')
    expect(copy.statusLine.toLowerCase()).not.toContain('arriving')
  })

  it('STALE copy with stage name includes stage name', () => {
    const copy = getTrackingCalloutCopy('STALE', 200, 'Westlands')
    expect(copy.statusLine).toContain('Westlands')
  })

  it('EXPIRED copy does not show ETA and has a disclaimer', () => {
    const copy = getTrackingCalloutCopy('EXPIRED', 1000)
    expect(copy.showEtaProminent).toBe(false)
    expect(copy.disclaimer).not.toBeNull()
    expect(copy.statusLine.toLowerCase()).toContain('expired')
  })

  it('EXPIRED copy never says "live" or "arriving"', () => {
    const copy = getTrackingCalloutCopy('EXPIRED', 1000)
    expect(copy.statusLine.toLowerCase()).not.toContain('live')
    expect(copy.statusLine.toLowerCase()).not.toContain('arriving')
  })
})

// ─── isLiveForCount ───────────────────────────────────────────────────────────

describe('isLiveForCount', () => {
  it('only LIVE counts as live', () => {
    expect(isLiveForCount('LIVE')).toBe(true)
    expect(isLiveForCount('ESTIMATED')).toBe(false)
    expect(isLiveForCount('STALE')).toBe(false)
    expect(isLiveForCount('EXPIRED')).toBe(false)
  })
})

// ─── isVisibleOnLiveMap ───────────────────────────────────────────────────────

describe('isVisibleOnLiveMap', () => {
  it('LIVE, ESTIMATED, and STALE are visible', () => {
    expect(isVisibleOnLiveMap('LIVE')).toBe(true)
    expect(isVisibleOnLiveMap('ESTIMATED')).toBe(true)
    expect(isVisibleOnLiveMap('STALE')).toBe(true)
  })

  it('EXPIRED is not visible', () => {
    expect(isVisibleOnLiveMap('EXPIRED')).toBe(false)
  })
})

// ─── formatAgeShort ───────────────────────────────────────────────────────────

describe('formatAgeShort', () => {
  it('formats seconds', () => {
    expect(formatAgeShort(0)).toBe('0s ago')
    expect(formatAgeShort(12)).toBe('12s ago')
    expect(formatAgeShort(59)).toBe('59s ago')
  })

  it('formats minutes', () => {
    expect(formatAgeShort(60)).toBe('1m ago')
    expect(formatAgeShort(90)).toBe('1m ago')
    expect(formatAgeShort(120)).toBe('2m ago')
    expect(formatAgeShort(3599)).toBe('59m ago')
  })

  it('formats hours', () => {
    expect(formatAgeShort(3600)).toBe('1h ago')
    expect(formatAgeShort(7200)).toBe('2h ago')
  })
})
