/**
 * LiveCorridorMap — All nganyas on a corridor with a mappable point (LIVE GPS or latest sighting).
 * Markers are clickable to open individual tracking (TrackingMapOverlay).
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { supabase } from '@/lib/supabase'
import {
  fetchCorridorNganyaMapPins,
  fetchStagePosition,
  type CorridorNganyaMapPin,
} from '@/lib/queries/tracking'
import { useGeolocationStream } from '@/hooks/useGeolocationStream'
import { NganyaMarker, StageMarker, UserMarker } from './TrackingMapMarkers'
import type { JourneyResult } from '@/lib/types/journey'
import type { TrackingPosition, TrackingSignalType } from '@/lib/types/tracking'

const MAP_STYLE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env: Record<string, string> }).env?.VITE_MAP_STYLE_URL) ||
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 }

function markerSignalForPin(pin: CorridorNganyaMapPin): TrackingSignalType {
  if (pin.pin_source === 'LIVE') return 'LIVE'
  const seen = new Date(pin.observed_at).getTime()
  if (!Number.isFinite(seen)) return 'ESTIMATED'
  const ageMin = (Date.now() - seen) / 60_000
  return ageMin > 45 ? 'STALE' : 'ESTIMATED'
}

function buildJourneyFromPin(
  pin: CorridorNganyaMapPin,
  corridorId: string,
  corridorName: string,
  results: JourneyResult[],
): JourneyResult {
  const row = results.find((r) => r.nganya_id === pin.nganya_id)
  if (row) {
    return {
      ...row,
      profile_photo_url: row.profile_photo_url ?? pin.profile_photo_url,
    }
  }
  const isLive = pin.pin_source === 'LIVE'
  return {
    nganya_id: pin.nganya_id,
    nganya_name: pin.nganya_name,
    corridor_id: corridorId,
    corridor_name: corridorName,
    tags: null,
    eta_minutes: Math.max(1, 5),
    confidence_level: isLive ? 'HIGH' : 'MEDIUM',
    source: isLive ? 'LIVE' : 'SIGHTING',
    last_seen_at: pin.observed_at,
    profile_photo_url: pin.profile_photo_url,
  }
}

export interface LiveCorridorMapProps {
  isActive: boolean
  corridorId: string
  corridorName: string
  pickupStage: { id: string; name: string }
  journeyResults: JourneyResult[]
  highlightNganyaId?: string | null
  onTrackNganya: (j: JourneyResult) => void
  compact?: boolean
}

export default function LiveCorridorMap({
  isActive,
  corridorId,
  corridorName,
  pickupStage,
  journeyResults,
  highlightNganyaId = null,
  onTrackNganya,
  compact = false,
}: LiveCorridorMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [pins, setPins] = useState<CorridorNganyaMapPin[]>([])
  const [stagePos, setStagePos] = useState<TrackingPosition | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { coords: userCoords } = useGeolocationStream()

  const loadPins = useCallback(async () => {
    try {
      setLoadError(null)
      const data = await fetchCorridorNganyaMapPins(corridorId)
      setPins(data)
    } catch {
      setLoadError('Could not load matatu positions')
    }
  }, [corridorId])

  useEffect(() => {
    if (!isActive) return
    loadPins()
    fetchStagePosition(pickupStage.id)
      .then(setStagePos)
      .catch(() => setStagePos(null))
  }, [isActive, corridorId, pickupStage.id, loadPins])

  useEffect(() => {
    if (!isActive || !corridorId) return

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => loadPins(), 900)
    }

    const channel = supabase
      .channel(`live_corridor_map_${corridorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
          filter: `corridor_id=eq.${corridorId}`,
        },
        schedule,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sightings',
          filter: `corridor_id=eq.${corridorId}`,
        },
        schedule,
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [isActive, corridorId, loadPins])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isActive) return

    const points: TrackingPosition[] = pins.map((p) => p.position)
    if (stagePos) points.push(stagePos)
    if (userCoords) points.push({ lat: userCoords.lat, lng: userCoords.lng })

    if (points.length === 0) return

    if (points.length === 1) {
      map.flyTo({
        center: [points[0].lng, points[0].lat],
        zoom: 15,
        duration: 500,
      })
      return
    }

    const lngs = points.map((p) => p.lng)
    const lats = points.map((p) => p.lat)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 16,
        duration: 600,
      },
    )
  }, [isActive, pins, stagePos, userCoords?.lat, userCoords?.lng])

  const heightClass = compact
    ? 'min-h-[260px] h-[min(42vh,360px)]'
    : 'min-h-[320px] h-[min(62vh,640px)]'

  if (!isActive) return null

  const liveCount = pins.filter((p) => p.pin_source === 'LIVE').length
  const sightCount = pins.filter((p) => p.pin_source === 'SIGHTING').length

  return (
    <div className="mb-4 shrink-0">
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-green)] animate-pulse" />
          {pins.length} on map
        </span>
        {liveCount > 0 ? (
          <span className="text-[var(--color-green)]">{liveCount} live GPS</span>
        ) : null}
        {sightCount > 0 ? (
          <span className="text-[var(--color-text-tertiary)]">{sightCount} from sightings</span>
        ) : null}
        <span className="text-[var(--color-text-tertiary)]">— tap a matatu to track</span>
      </p>
      <div
        className={`relative w-full rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)] ${heightClass}`}
      >
        {loadError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-body)]/92 text-xs text-[var(--color-text-secondary)] px-4 text-center">
            {loadError}
          </div>
        ) : null}
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: DEFAULT_CENTER.lat,
            longitude: DEFAULT_CENTER.lng,
            zoom: 14,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE_URL}
          attributionControl={false}
          reuseMaps
        >
          <NavigationControl position="top-right" />
          {userCoords ? (
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
          ) : null}
          {stagePos ? (
            <Marker
              longitude={stagePos.lng}
              latitude={stagePos.lat}
              anchor="bottom"
            >
              <StageMarker name={pickupStage.name} size={36} />
            </Marker>
          ) : null}
          {pins.map((pin) => {
            const signal = markerSignalForPin(pin)
            return (
              <Marker
                key={`${pin.nganya_id}-${pin.pin_source}`}
                longitude={pin.position.lng}
                latitude={pin.position.lat}
                anchor="bottom"
              >
                <button
                  type="button"
                  title={`${pin.nganya_name}${pin.pin_source === 'SIGHTING' ? ' (sighting)' : ''}`}
                  onClick={() =>
                    onTrackNganya(
                      buildJourneyFromPin(pin, corridorId, corridorName, journeyResults),
                    )
                  }
                  className="cursor-pointer bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 rounded-full"
                  aria-label={`Track ${pin.nganya_name}`}
                >
                  <span
                    className={
                      highlightNganyaId === pin.nganya_id
                        ? 'block scale-110 drop-shadow-[0_0_14px_rgba(255,45,120,0.85)]'
                        : 'block'
                    }
                  >
                    <NganyaMarker
                      signalType={signal}
                      heading={null}
                      size={46}
                      name={pin.nganya_name}
                      imageUrl={pin.profile_photo_url}
                    />
                  </span>
                </button>
              </Marker>
            )
          })}
        </Map>
        {pins.length === 0 && !loadError ? (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-2 text-center text-[11px] text-white/90 backdrop-blur-sm">
            No matatus with a map position on this route yet.
          </div>
        ) : null}
      </div>
    </div>
  )
}
