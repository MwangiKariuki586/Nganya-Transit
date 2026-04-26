/**
 * useTracking — Domain hook for the map-first tracking experience.
 *
 * Responsibilities:
 * - ETA decrement via time-based ref (not event-count based)
 * - Realtime subscription to live_sessions for this nganya
 * - Realtime subscription to sightings for this corridor (estimated mode)
 * - Inline position parsing from Realtime payloads (avoids extra HTTP round-trip)
 * - Catchability computation (ETA vs walk time vs signal freshness)
 * - Nganya + stage position initial fetches
 * - Walk-time via closest_stages RPC when userCoords provided
 * - Boarded / Missed feedback actions
 * - Subscription cleanup on deactivation / unmount (no leaks)
 *
 * NOT responsible for:
 * - Geolocation permission / watchPosition (delegated to useGeolocationStream in overlay)
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchNganyaPosition,
  fetchStagePosition,
  postTrackingFeedback,
  parsePostgisPoint,
} from '@/lib/queries/tracking'
import {
  TRACKING_THRESHOLDS,
  type TrackingPayload,
  type TrackingPosition,
  type TrackingSignalType,
  type CatchabilityResult,
  type FeedbackState,
} from '@/lib/types/tracking'
import type { ConfidenceLevel, JourneyResult } from '@/lib/types/journey'

// ─── RPC walk-time helper ─────────────────────────────────────────────────────

async function fetchWalkTimeMinutes(
  corridorId: string,
  stageId: string,
  lat: number,
  lng: number,
): Promise<number | null> {
  try {
    const { data } = await (supabase.rpc as CallableFunction)('closest_stages', {
      p_corridor_id: corridorId,
      p_lat: lat,
      p_lng: lng,
      p_limit: 20,
      p_max_meters: 10_000,
    })
    if (!data) return null
    const match = (data as Array<{ id: string; distance_m: number }>).find(
      (s) => s.id === stageId,
    )
    if (!match) return null
    return Math.max(1, Math.ceil(match.distance_m / TRACKING_THRESHOLDS.WALK_SPEED_MPM))
  } catch {
    return null
  }
}

// ─── Signal type resolver ─────────────────────────────────────────────────────

function resolveSignalType(
  rawSource: 'LIVE' | 'SIGHTING',
  freshnessSec: number,
): TrackingSignalType {
  if (rawSource === 'LIVE') {
    if (freshnessSec <= TRACKING_THRESHOLDS.LIVE_FRESH_MAX_S) return 'LIVE'
    if (freshnessSec <= TRACKING_THRESHOLDS.LIVE_AGING_MAX_S) return 'ESTIMATED'
    return 'STALE'
  }
  // SIGHTING source
  const freshnessMin = freshnessSec / 60
  if (freshnessMin <= TRACKING_THRESHOLDS.SIGHTING_USABLE_MAX_MIN) return 'ESTIMATED'
  return 'STALE'
}

// ─── Catchability computation ─────────────────────────────────────────────────

function computeCatchability(params: {
  etaMinutes: number
  walkTimeMinutes: number | null
  signalType: TrackingSignalType
  confidence: ConfidenceLevel
}): CatchabilityResult {
  const { etaMinutes, walkTimeMinutes, signalType, confidence } = params

  if (signalType === 'STALE') {
    return {
      status: 'STALE_UNCERTAIN',
      label: 'Tracking stale',
      subtext: 'Signal lost — consider alternatives',
    }
  }

  if (confidence === 'LOW' && signalType === 'ESTIMATED') {
    return {
      status: 'STALE_UNCERTAIN',
      label: 'Low confidence',
      subtext: 'Estimate uncertain — consider alternatives',
    }
  }

  if (walkTimeMinutes !== null) {
    const buffer = TRACKING_THRESHOLDS.LEAVE_BUFFER_MIN
    const margin = etaMinutes - walkTimeMinutes - buffer

    if (margin < 0) {
      return {
        status: 'TOO_FAR',
        label: 'Too far',
        subtext: 'Better options may be available',
      }
    }
    if (margin < 3) {
      return {
        status: 'RISKY',
        label: 'Risky — start moving now',
        subtext: `Only ~${Math.max(0, Math.round(margin))} min margin`,
      }
    }
    return {
      status: 'CATCHABLE',
      label: 'Catchable',
      subtext: `~${Math.round(margin)} min before you need to leave`,
    }
  }

  // No walk time — use ETA alone as rough proxy
  if (etaMinutes <= 2) {
    return {
      status: 'RISKY',
      label: 'Arriving soon',
      subtext: 'Get to the stage now',
    }
  }
  return {
    status: 'CATCHABLE',
    label: 'Catchable — likely arriving soon',
    subtext: signalType === 'ESTIMATED' ? 'Sightings-based estimate' : 'Live signal active',
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTrackingOptions {
  nganya: JourneyResult
  stage: { id: string; name: string }
  allResults?: JourneyResult[]
  /** Must be true for subscriptions to be active; set false when overlay closes. */
  isActive: boolean
  /**
   * Continuous user coordinates fed from useGeolocationStream in the overlay.
   * When provided, hook computes walk time to the pickup stage.
   * null = location not yet available / denied.
   */
  userCoords?: { lat: number; lng: number } | null
}

export interface UseTrackingReturn {
  payload: TrackingPayload
  isLoadingPosition: boolean
  positionError: string | null
  feedbackState: FeedbackState
  handleBoarded: () => Promise<void>
  handleMissed: () => Promise<void>
  retryPosition: () => void
}

export function useTracking({
  nganya,
  stage,
  allResults = [],
  isActive,
  userCoords = null,
}: UseTrackingOptions): UseTrackingReturn {
  // ── ETA via time-based refs (survives re-renders without drifting) ──────────
  const etaBaseRef = useRef(nganya.eta_minutes)
  const etaBaseTimestampRef = useRef(Date.now())

  // ── Core state ─────────────────────────────────────────────────────────────
  const [lastUpdateAt, setLastUpdateAt] = useState<Date>(() => new Date())
  const [confidence, setConfidence] = useState<ConfidenceLevel>(nganya.confidence_level)
  const [rawSource, setRawSource] = useState<'LIVE' | 'SIGHTING'>(nganya.source)
  const [tick, setTick] = useState(0)

  // ── Position state ─────────────────────────────────────────────────────────
  const [nganyaPosition, setNganyaPosition] = useState<TrackingPosition | null>(null)
  const [stagePosition, setStagePosition] = useState<TrackingPosition | null>(null)
  const [isLoadingPosition, setIsLoadingPosition] = useState(true)
  const [positionError, setPositionError] = useState<string | null>(null)
  const [walkTimeMinutes, setWalkTimeMinutes] = useState<number | null>(null)

  // ── Feedback state ─────────────────────────────────────────────────────────
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle')

  // ── Derived ETA (ticks every TICK_MS) ─────────────────────────────────────
  const etaMinutes = useMemo(() => {
    const elapsedMin = (Date.now() - etaBaseTimestampRef.current) / 60_000
    return Math.max(1, Math.round(etaBaseRef.current - elapsedMin))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, lastUpdateAt])

  const freshnessSec = useMemo(
    () => Math.floor((Date.now() - lastUpdateAt.getTime()) / 1_000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, lastUpdateAt],
  )

  // ── ETA tick interval ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    const id = setInterval(
      () => setTick((t) => t + 1),
      TRACKING_THRESHOLDS.ETA_TICK_MS,
    )
    return () => clearInterval(id)
  }, [isActive])

  // ── Realtime: live_sessions for this nganya ────────────────────────────────
  useEffect(() => {
    if (!isActive) return

    const channel = supabase
      .channel(`track_nganya_${nganya.nganya_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `nganya_id=eq.${nganya.nganya_id}`,
        },
        (realtimePayload) => {
          const row = realtimePayload.new as {
            last_location?: unknown
            last_ping_at?: string
            status?: string
          }

          setLastUpdateAt(new Date())
          setRawSource('LIVE')

          // Parse position inline from the Realtime payload — no extra HTTP call
          if (row.last_location) {
            const pos = parsePostgisPoint(row.last_location)
            if (pos) setNganyaPosition(pos)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isActive, nganya.nganya_id])

  // ── Realtime: sightings for this corridor (estimated mode) ────────────────
  useEffect(() => {
    if (!isActive || rawSource === 'LIVE') return

    const channel = supabase
      .channel(`tracking_sightings_${nganya.corridor_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sightings',
          filter: `corridor_id=eq.${nganya.corridor_id}`,
        },
        (realtimePayload) => {
          const row = realtimePayload.new as {
            nganya_id?: string
            location?: unknown
          }
          if (row.nganya_id === nganya.nganya_id) {
            setLastUpdateAt(new Date())
            // Parse sighting location inline
            if (row.location) {
              const pos = parsePostgisPoint(row.location)
              if (pos) setNganyaPosition(pos)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isActive, rawSource, nganya.nganya_id, nganya.corridor_id])

  // ── Position fetch (initial load) ─────────────────────────────────────────
  const loadPositions = useCallback(async () => {
    setIsLoadingPosition(true)
    setPositionError(null)

    try {
      const [nganyaPos, stagePos] = await Promise.all([
        fetchNganyaPosition(nganya.nganya_id),
        fetchStagePosition(stage.id),
      ])
      setNganyaPosition(nganyaPos)
      setStagePosition(stagePos)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load positions'
      setPositionError(msg)
    } finally {
      setIsLoadingPosition(false)
    }
  }, [nganya.nganya_id, stage.id])

  useEffect(() => {
    if (!isActive) return
    loadPositions()
  }, [isActive, loadPositions])

  // ── Walk time: recompute when user coords change ───────────────────────────
  useEffect(() => {
    if (!isActive || !userCoords) return
    fetchWalkTimeMinutes(
      nganya.corridor_id,
      stage.id,
      userCoords.lat,
      userCoords.lng,
    )
      .then((mins) => { if (mins !== null) setWalkTimeMinutes(mins) })
      .catch((err) => console.warn('[tracking] walk time fetch failed:', err))
  }, [isActive, userCoords, nganya.corridor_id, stage.id])

  // ── Confidence downgrade on staleness ─────────────────────────────────────
  const signalType = useMemo(
    () => resolveSignalType(rawSource, freshnessSec),
    [rawSource, freshnessSec],
  )

  useEffect(() => {
    if (signalType === 'STALE' && rawSource === 'LIVE') {
      setRawSource('SIGHTING')
      setConfidence('LOW')
    } else if (signalType === 'ESTIMATED' && confidence === 'HIGH') {
      setConfidence('MEDIUM')
    }
  }, [signalType, rawSource, confidence])

  // ── Catchability ───────────────────────────────────────────────────────────
  const catchability = useMemo(
    () =>
      computeCatchability({
        etaMinutes,
        walkTimeMinutes,
        signalType,
        confidence,
      }),
    [etaMinutes, walkTimeMinutes, signalType, confidence],
  )

  // ── Alternatives ───────────────────────────────────────────────────────────
  const alternatives = useMemo(
    () =>
      allResults
        .filter(
          (r) =>
            r.nganya_id !== nganya.nganya_id &&
            r.eta_minutes < etaMinutes + 5,
        )
        .slice(0, 3),
    [allResults, nganya.nganya_id, etaMinutes],
  )

  // ── Payload assembly ───────────────────────────────────────────────────────
  const userPosition: TrackingPosition | null = userCoords
    ? { lat: userCoords.lat, lng: userCoords.lng }
    : null

  const payload = useMemo(
    (): TrackingPayload => ({
      nganya_id: nganya.nganya_id,
      nganya_name: nganya.nganya_name,
      corridor_id: nganya.corridor_id,
      corridor_name: nganya.corridor_name,
      direction: null,

      source_type: signalType,
      raw_source: rawSource,
      confidence_level: confidence,
      freshness_seconds: freshnessSec,
      last_update_at: lastUpdateAt,

      nganya_position: nganyaPosition,
      pickup_stage_position: stagePosition,
      user_position: userPosition,

      eta_minutes: etaMinutes,
      last_stage_name: null,
      stages_away: null,

      catchability,
      walk_time_minutes: walkTimeMinutes,

      alternatives,
    }),
    [
      nganya,
      signalType,
      rawSource,
      confidence,
      freshnessSec,
      lastUpdateAt,
      nganyaPosition,
      stagePosition,
      userPosition,
      etaMinutes,
      catchability,
      walkTimeMinutes,
      alternatives,
    ],
  )

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleBoarded = useCallback(async () => {
    setFeedbackState('submitting')
    try {
      await postTrackingFeedback({
        action: 'BOARDED',
        nganya_id: nganya.nganya_id,
        corridor_id: nganya.corridor_id,
        stage_id: stage.id,
        eta_was: etaMinutes,
        user_position: userPosition,
      })
      setFeedbackState('boarded')
    } catch {
      setFeedbackState('error')
    }
  }, [nganya.nganya_id, nganya.corridor_id, stage.id, etaMinutes, userPosition])

  const handleMissed = useCallback(async () => {
    setFeedbackState('submitting')
    try {
      await postTrackingFeedback({
        action: 'MISSED',
        nganya_id: nganya.nganya_id,
        corridor_id: nganya.corridor_id,
        stage_id: stage.id,
        eta_was: etaMinutes,
        user_position: userPosition,
      })
      setFeedbackState('missed')
    } catch {
      setFeedbackState('error')
    }
  }, [nganya.nganya_id, nganya.corridor_id, stage.id, etaMinutes, userPosition])

  return {
    payload,
    isLoadingPosition,
    positionError,
    feedbackState,
    handleBoarded,
    handleMissed,
    retryPosition: loadPositions,
  }
}
