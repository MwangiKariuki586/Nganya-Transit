/**
 * TrackingMapOverlay — Full-screen map-first tracking experience.
 *
 * Layout:
 *   ┌─────────────────────────────────┐
 *   │  [×]              [LIVE badge]  │  ← overlay controls (z-30)
 *   │                                 │
 *   │         MapLibre GL map         │  ← map fills the screen (z-0)
 *   │    (nganya + stage + user pins) │
 *   │                                 │
 *   │                      [⊙ FAB]   │  ← recenter FAB when camera is free
 *   ├─────────────────────────────────┤
 *   │  ▬  Snap-point bottom sheet    │  ← collapsed / half / expanded (z-20)
 *   └─────────────────────────────────┘
 *
 * Hook composition:
 *   useGeolocationStream  → continuous user GPS (watchPosition)
 *   useTracking           → ETA, Realtime positions, catchability, feedback
 *   useAnimatedPosition   → smooth rAF-lerped nganya marker position
 *   useCameraTracking     → auto/free camera with recenter
 *
 * Tile style: CARTO Voyager (buildings, POI labels, subtle terrain — free, no key).
 * Override via VITE_MAP_STYLE_URL.
 */

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import { X, MapPin, AlertTriangle, WifiOff, Clock, Navigation2 } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useTracking } from '@/hooks/useTracking'
import { useGeolocationStream } from '@/hooks/useGeolocationStream'
import { useAnimatedPosition } from '@/hooks/useAnimatedPosition'
import { useCameraTracking } from '@/hooks/useCameraTracking'
import TrackingBottomSheet from './tracking/TrackingBottomSheet'
import TrackingAlternatives from './tracking/TrackingAlternatives'
import {
  NganyaMarker,
  StageMarker,
  UserMarker,
} from './tracking/TrackingMapMarkers'
import CatchabilityBadge from '@/components/ui/CatchabilityBadge'
import TrackingSignalBadge from '@/components/ui/TrackingSignalBadge'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge'
import { LoadingButton } from '@/components/ui/loading'
import { InlineErrorState } from '@/components/error/InlineErrorState'
import { CheckCircle, XCircle } from 'lucide-react'

import type { JourneyResult } from '@/lib/types/journey'
import type { TrackingPosition, SheetSnapState } from '@/lib/types/tracking'

// ─── Map config ───────────────────────────────────────────────────────────────

const MAP_STYLE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_MAP_STYLE_URL) ||
  // Voyager: buildings, POI labels, subtle terrain — closer to Uber's aesthetic
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

/** Default map center (Nairobi CBD) when no positions are available yet */
const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 }
const DEFAULT_ZOOM = 15

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatSecondsAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TrackingMapOverlayProps {
  isOpen: boolean
  onClose: () => void
  nganya: JourneyResult
  stage: { id: string; name: string }
  allResults?: JourneyResult[]
  onSwitch?: (nganya: JourneyResult) => void
}

export default function TrackingMapOverlay({
  isOpen,
  onClose,
  nganya,
  stage,
  allResults = [],
  onSwitch,
}: TrackingMapOverlayProps) {
  const mapRef = useRef<MapRef>(null)
  const [sheetSnap, setSheetSnap] = useState<SheetSnapState>('half')
  const [mapError, setMapError] = useState(false)

  // ── Continuous user geolocation ───────────────────────────────────────────
  const {
    coords: userCoords,
    permissionStatus,
    requestPermission,
  } = useGeolocationStream()

  // ── Domain tracking state + Realtime subscriptions ───────────────────────
  const {
    payload,
    isLoadingPosition,
    positionError,
    feedbackState,
    handleBoarded,
    handleMissed,
    retryPosition,
  } = useTracking({
    nganya,
    stage,
    allResults,
    isActive: isOpen,
    userCoords: userCoords ? { lat: userCoords.lat, lng: userCoords.lng } : null,
  })

  // ── Smooth animated nganya position (rAF lerp) ────────────────────────────
  const animatedNganya = useAnimatedPosition({
    position: payload.nganya_position,
    duration: 1600,
  })

  // Expose animated position as a TrackingPosition for camera + marker use
  const animatedNganyaPos: TrackingPosition | null = payload.nganya_position
    ? { lat: animatedNganya.lat, lng: animatedNganya.lng }
    : null

  // ── Camera auto-tracking ─────────────────────────────────────────────────
  const userPos: TrackingPosition | null = userCoords
    ? { lat: userCoords.lat, lng: userCoords.lng }
    : null

  const { isAutoTracking, onUserPan, recenter } = useCameraTracking({
    mapRef,
    nganyaPosition: animatedNganyaPos,
    stagePosition: payload.pickup_stage_position,
    userPosition: userPos,
    isActive: isOpen,
  })

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  // Reset snap + map error when overlay opens
  useEffect(() => {
    if (isOpen) {
      setSheetSnap('half')
      setMapError(false)
    }
  }, [isOpen])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Escalate sheet when signal goes stale / catchability degrades
  useEffect(() => {
    if (
      payload.source_type === 'STALE' ||
      payload.catchability.status === 'TOO_FAR'
    ) {
      setSheetSnap((prev) => (prev === 'collapsed' ? 'half' : prev))
    }
  }, [payload.source_type, payload.catchability.status])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSwitch = useCallback(
    (alt: JourneyResult) => {
      onSwitch?.(alt)
      onClose()
    },
    [onSwitch, onClose],
  )

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  // ── Initial map viewport ─────────────────────────────────────────────────
  const mapCenter =
    payload.nganya_position ??
    payload.pickup_stage_position ??
    DEFAULT_CENTER

  // ── Peek bar content (always visible in collapsed state) ─────────────────
  const peekContent = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
          {payload.nganya_name}
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] truncate">
          {stage.name}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-2xl font-bold text-[var(--color-accent)] leading-none">
          {payload.eta_minutes}
          <span className="text-sm font-normal ml-0.5">m</span>
        </span>
        <CatchabilityBadge
          status={payload.catchability.status}
          label={payload.catchability.status === 'CATCHABLE' ? '✓' :
                 payload.catchability.status === 'RISKY' ? '!' :
                 payload.catchability.status === 'TOO_FAR' ? '✗' : '?'}
        />
      </div>
    </div>
  )

  // ── Main panel content (half + expanded) ─────────────────────────────────
  const mainContent = (
    <div className="space-y-4">
      {/* Stale warning */}
      {payload.source_type === 'STALE' && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]">
          <AlertTriangle className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">
              Tracking signal lost
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              Last update {formatSecondsAgo(payload.freshness_seconds)} — data may be unreliable
            </p>
          </div>
        </div>
      )}

      {/* Primary ETA + signal block */}
      <div
        className="relative p-5 rounded-[var(--radius-xl)] border overflow-hidden"
        style={{
          backgroundColor: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* LIVE glow */}
        {payload.source_type === 'LIVE' && (
          <div
            className="absolute inset-0 blur-2xl pointer-events-none animate-pulse-slow"
            style={{ backgroundColor: 'var(--color-green)', opacity: 0.06 }}
          />
        )}

        <div className="relative z-10 flex items-start justify-between gap-4">
          {/* ETA */}
          <div>
            <div
              className="text-5xl font-bold leading-none"
              style={{ color: 'var(--color-accent)' }}
            >
              {payload.eta_minutes}
              <span className="text-xl font-normal ml-1 opacity-70">min</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Estimated arrival at {stage.name}
            </p>
          </div>

          {/* Signal badges */}
          <div className="flex flex-col items-end gap-1.5">
            <TrackingSignalBadge
              signalType={payload.source_type}
              freshnessSeconds={payload.freshness_seconds}
            />
            <ConfidenceBadge level={payload.confidence_level} />
          </div>
        </div>

        {/* Last update row */}
        <div
          className="relative z-10 flex items-center gap-1.5 mt-3 pt-3 border-t"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <Clock className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Updated {formatSecondsAgo(payload.freshness_seconds)}
          </span>
          {payload.source_type === 'ESTIMATED' && (
            <span className="text-xs ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
              · Sightings-based estimate
            </span>
          )}
        </div>
      </div>

      {/* Catchability */}
      <CatchabilityBadge
        status={payload.catchability.status}
        label={payload.catchability.label}
        subtext={payload.catchability.subtext}
      />

      {/* Movement guidance / walk time */}
      {payload.walk_time_minutes !== null ? (
        <MovementGuidance
          etaMinutes={payload.eta_minutes}
          walkTimeMinutes={payload.walk_time_minutes}
          stageName={stage.name}
        />
      ) : (
        <LocationPrompt
          permissionStatus={permissionStatus}
          requestPermission={requestPermission}
        />
      )}

      {/* Stage context */}
      {(payload.last_stage_name || payload.stages_away !== null) && (
        <StageContextRow
          lastStageName={payload.last_stage_name}
          stagesAway={payload.stages_away}
          signalType={payload.source_type}
        />
      )}

      {/* Feedback */}
      <FeedbackActions
        feedbackState={feedbackState}
        onBoarded={handleBoarded}
        onMissed={handleMissed}
        hasAlternatives={payload.alternatives.length > 0}
        onExpandForAlternatives={() => setSheetSnap('expanded')}
      />
    </div>
  )

  // ── Expanded-only: alternatives ────────────────────────────────────────────
  const expandedContent =
    payload.alternatives.length > 0 ? (
      <TrackingAlternatives
        alternatives={payload.alternatives}
        catchabilityStatus={payload.catchability.status}
        onSwitch={handleSwitch}
      />
    ) : null

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col">
      {/* ── Map layer ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {!mapError ? (
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: mapCenter.lng,
              latitude: mapCenter.lat,
              zoom: DEFAULT_ZOOM,
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle={MAP_STYLE_URL}
            onError={() => setMapError(true)}
            // `onMoveStart` also fires for programmatic flyTo/fitBounds — that wrongly
            // flipped the camera to "free" and showed Recenter on every open.
            // Drag-only: user pan exits auto-follow; wheel/pinch zoom still keeps auto.
            onDragStart={onUserPan}
            reuseMaps
            attributionControl={false}
          >
            <NavigationControl position="top-right" style={{ marginTop: 60 }} />

            {/* User location — first (lowest z-order on map) */}
            {userCoords && (
              <Marker
                longitude={userCoords.lng}
                latitude={userCoords.lat}
                anchor="center"
              >
                <UserMarker
                  accuracy={userCoords.accuracy}
                  heading={userCoords.heading}
                />
              </Marker>
            )}

            {/* Nganya — animated position, teardrop pin anchored at tail tip */}
            {animatedNganyaPos && (
              <Marker
                longitude={animatedNganyaPos.lng}
                latitude={animatedNganyaPos.lat}
                anchor="bottom"
              >
                <NganyaMarker
                  signalType={payload.source_type}
                  heading={animatedNganya.heading}
                  name={nganya.nganya_name}
                  imageUrl={nganya.profile_photo_url ?? null}
                />
              </Marker>
            )}

            {/* Pickup stage — teardrop pin anchored at tail tip */}
            {payload.pickup_stage_position && (
              <Marker
                longitude={payload.pickup_stage_position.lng}
                latitude={payload.pickup_stage_position.lat}
                anchor="bottom"
              >
                <StageMarker name={stage.name} />
              </Marker>
            )}
          </Map>
        ) : (
          <MapFallback
            nganyaName={nganya.nganya_name}
            stageName={stage.name}
          />
        )}
      </div>

      {/* ── Overlay controls ─────────────────────────────────────────────── */}
      <div className="relative z-30 flex items-start justify-between p-4 pointer-events-none">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full text-white shadow-lg transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'rgba(10,10,15,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
          }}
          aria-label="Close tracking"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Signal badge top-right */}
        <div className="pointer-events-none">
          <TrackingSignalBadge
            signalType={payload.source_type}
            compact={false}
            className="shadow-lg"
          />
        </div>
      </div>

      {/* ── Position loading / error ────────────────────────────────────── */}
      {isLoadingPosition && !payload.nganya_position && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              backgroundColor: 'rgba(10,10,15,0.8)',
              border: '1px solid var(--glass-border)',
              color: 'var(--color-text-secondary)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Locating nganya…
          </div>
        </div>
      )}

      {positionError && !payload.nganya_position && (
        <div className="absolute top-16 left-4 right-4 z-30">
          <InlineErrorState
            message="Could not load map positions"
            onRetry={retryPosition}
          />
        </div>
      )}

      {/* Nganya has no GPS in DB yet — matatu pin cannot render */}
      {!isLoadingPosition && !positionError && !payload.nganya_position && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-[min(92vw,22rem)]">
          <div
            className="px-3 py-2 rounded-xl text-xs text-center"
            style={{
              backgroundColor: 'rgba(10,10,15,0.88)',
              border: '1px solid var(--glass-border)',
              color: 'var(--color-text-secondary)',
              backdropFilter: 'blur(8px)',
            }}
          >
            No live GPS for this nganya yet — map shows your location only. When the crew
            shares location or a sighting arrives, the matatu pin appears here.
          </div>
        </div>
      )}

      {/* ── Recenter FAB — visible when user has panned away ────────────── */}
      {!isAutoTracking && !mapError && (
        <button
          onClick={recenter}
          className="absolute z-30 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{
            bottom: 280,
            right: 16,
            backgroundColor: 'rgba(10,10,15,0.85)',
            color: '#ffffff',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(12px)',
          }}
          aria-label="Recenter map on nganya"
        >
          <Navigation2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          Recenter
        </button>
      )}

      {/* ── Bottom sheet (snap-point) ────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <TrackingBottomSheet
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            onClose={handleClose}
            peekContent={peekContent}
            mainContent={mainContent}
            expandedContent={expandedContent}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function MovementGuidance({
  etaMinutes,
  walkTimeMinutes,
  stageName,
}: {
  etaMinutes: number
  walkTimeMinutes: number
  stageName: string
}) {
  const BUFFER = 2
  const margin = etaMinutes - walkTimeMinutes - BUFFER

  let message: string
  let isUrgent = false

  if (margin <= 0) {
    message = 'Leave now!'
    isUrgent = true
  } else if (margin <= 3) {
    message = `Get ready — leave in ${Math.round(margin)}m`
    isUrgent = true
  } else {
    message = `You can wait — leave in ~${Math.round(margin)}m`
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border"
      style={{
        backgroundColor: isUrgent ? 'var(--color-accent-soft)' : 'var(--glass-bg)',
        borderColor: isUrgent ? 'var(--color-accent)' : 'var(--glass-border)',
      }}
    >
      <MapPin
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: isUrgent ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
      />
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: isUrgent ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
        >
          {message}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
          ~{walkTimeMinutes}m walk to {stageName}
        </p>
      </div>
    </div>
  )
}

export function LocationPrompt({
  permissionStatus,
  requestPermission,
}: {
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported'
  requestPermission: () => void
}) {
  if (permissionStatus === 'unsupported') return null

  if (permissionStatus === 'denied') {
    return (
      <div
        className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] border"
        style={{
          backgroundColor: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <MapPin className="w-4 h-4 shrink-0" />
        <span className="text-xs">Enable location in browser settings for walk-time guidance</span>
      </div>
    )
  }

  return (
    <button
      onClick={requestPermission}
      className="w-full flex items-center gap-2 p-3 rounded-[var(--radius-md)] border text-left transition-colors hover:border-[var(--color-accent-soft)]"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
      <span className="text-sm">Enable location for walk-time guidance</span>
    </button>
  )
}

export function StageContextRow({
  lastStageName,
  stagesAway,
  signalType,
}: {
  lastStageName: string | null
  stagesAway: number | null
  signalType: 'LIVE' | 'ESTIMATED' | 'STALE'
}) {
  const isEstimatedOrStale = signalType !== 'LIVE'

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]"
      style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
    >
      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {lastStageName
          ? isEstimatedOrStale
            ? `Last seen near ${lastStageName}`
            : `At ${lastStageName}`
          : stagesAway !== null
            ? `${stagesAway} stage${stagesAway !== 1 ? 's' : ''} away`
            : 'Position updating…'}
      </p>
    </div>
  )
}

export function FeedbackActions({
  feedbackState,
  onBoarded,
  onMissed,
  hasAlternatives,
  onExpandForAlternatives,
}: {
  feedbackState: 'idle' | 'submitting' | 'boarded' | 'missed' | 'error'
  onBoarded: () => void
  onMissed: () => void
  hasAlternatives: boolean
  onExpandForAlternatives: () => void
}) {
  if (feedbackState === 'boarded') {
    return (
      <div
        className="flex items-center gap-2 p-4 rounded-[var(--radius-md)]"
        style={{ backgroundColor: 'var(--color-green-soft)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-green)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-green)' }}>
            Boarded!
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Thanks — you helped improve this signal.
          </p>
        </div>
      </div>
    )
  }

  if (feedbackState === 'missed') {
    return (
      <div className="space-y-3">
        <div
          className="flex items-center gap-2 p-4 rounded-[var(--radius-md)]"
          style={{ backgroundColor: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}
        >
          <XCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
              Missed it
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {hasAlternatives
                ? "Let's find the next best option."
                : "We'll keep looking for alternatives."}
            </p>
          </div>
        </div>
        {hasAlternatives && (
          <button
            onClick={onExpandForAlternatives}
            className="w-full py-2 text-sm font-semibold rounded-[var(--radius-md)] transition-colors"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
            }}
          >
            See alternatives
          </button>
        )}
      </div>
    )
  }

  if (feedbackState === 'error') {
    return (
      <InlineErrorState
        message="Could not save your feedback. Please try again."
        retryLabel="Retry"
        onRetry={onBoarded}
      />
    )
  }

  const isSubmitting = feedbackState === 'submitting'

  return (
    <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--glass-border)' }}>
      <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
        Did you catch it?
      </p>
      <div className="flex gap-3">
        <LoadingButton
          variant="secondary"
          className="flex-1 gap-2"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } as CSSProperties}
          onClick={onMissed}
          isLoading={isSubmitting}
          loadingLabel="Saving…"
          disabled={isSubmitting}
        >
          <XCircle className="w-4 h-4" />
          Missed it
        </LoadingButton>
        <LoadingButton
          variant="primary"
          className="flex-1 gap-2"
          style={{ backgroundColor: 'var(--color-green)', color: 'white' } as CSSProperties}
          onClick={onBoarded}
          isLoading={isSubmitting}
          loadingLabel="Saving…"
          disabled={isSubmitting}
        >
          <CheckCircle className="w-4 h-4" />
          I Boarded
        </LoadingButton>
      </div>
    </div>
  )
}

function MapFallback({
  nganyaName,
  stageName,
}: {
  nganyaName: string
  stageName: string
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: 'var(--color-bg-body)' }}
    >
      <WifiOff
        className="w-10 h-10 opacity-30"
        style={{ color: 'var(--color-text-tertiary)' }}
      />
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          Map unavailable
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Tracking {nganyaName} to {stageName}
        </p>
      </div>
    </div>
  )
}
