/**
 * LiveCorridorMap — All nganyas on a corridor with a mappable point (LIVE GPS or latest sighting).
 * Markers are clickable to open individual tracking (TrackingMapOverlay).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { supabase } from "@/lib/supabase";
import {
  fetchCorridorNganyaMapPins,
  fetchStagePosition,
  type CorridorNganyaMapPin,
} from "@/lib/queries/tracking";
import { useGeolocationStream } from "@/hooks/useGeolocationStream";
import { NganyaMarker, StageMarker, UserMarker } from "./TrackingMapMarkers";
import type { JourneyResult } from "@/lib/types/journey";
import type {
  TrackingPosition,
  TrackingSignalType,
} from "@/lib/types/tracking";

const MAP_STYLE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env: Record<string, string> }).env
      ?.VITE_MAP_STYLE_URL) ||
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };

function markerSignalForPin(pin: CorridorNganyaMapPin): TrackingSignalType {
  if (pin.pin_source === "LIVE") return "LIVE";
  const seen = new Date(pin.observed_at).getTime();
  if (!Number.isFinite(seen)) return "ESTIMATED";
  const ageMin = (Date.now() - seen) / 60_000;
  return ageMin > 45 ? "STALE" : "ESTIMATED";
}

function buildJourneyFromPin(
  pin: CorridorNganyaMapPin,
  corridorId: string,
  corridorName: string,
  results: JourneyResult[],
): JourneyResult {
  const row = results.find((r) => r.nganya_id === pin.nganya_id);
  if (row) {
    return {
      ...row,
      profile_photo_url: row.profile_photo_url ?? pin.profile_photo_url,
    };
  }
  const isLive = pin.pin_source === "LIVE";
  return {
    nganya_id: pin.nganya_id,
    nganya_name: pin.nganya_name,
    corridor_id: corridorId,
    corridor_name: corridorName,
    tags: null,
    eta_minutes: Math.max(1, 5),
    confidence_level: isLive ? "HIGH" : "MEDIUM",
    source: isLive ? "LIVE" : "SIGHTING",
    last_seen_at: pin.observed_at,
    profile_photo_url: pin.profile_photo_url,
  };
}

export interface LiveCorridorMapProps {
  isActive: boolean;
  /** When null, map shows default center with no pins (caller can use `emptyOverlay`). */
  corridorId: string | null;
  corridorName: string;
  /** When omitted, stage marker is hidden and stage position is not fetched. */
  pickupStage?: { id: string; name: string } | null;
  journeyResults: JourneyResult[];
  highlightNganyaId?: string | null;
  onTrackNganya: (j: JourneyResult) => void;
  compact?: boolean;
  /** Shorter map height for dense layouts (e.g. fan home Top Answers). */
  dense?: boolean;
  /**
   * Grow to fill a flex parent (e.g. align map column to WhereTo height).
   * When true, `dense`/`compact` height caps are not used; parent should set `h-full min-h-0`.
   */
  fillRowHeight?: boolean;
  /** Replaces default “no corridor” overlay copy. */
  emptyOverlay?: string | null;
  /** When false, no dimmed overlay when `corridorId` is null (map only). */
  showNoCorridorOverlay?: boolean;
  /** Hide the stats line above the map (when the parent already has a section title). */
  showCaption?: boolean;
  /**
   * Square bottom corners so the map meets a stacked card below with no gap (e.g. inline tracking).
   */
  flushBottom?: boolean;
  /**
   * Optional route line overlay (e.g. OSRM route between a selected nganya and pickup stage).
   * Coordinates must be [lng, lat].
   */
  routeLine?: { coordinates: [number, number][] } | null;
  /** Optional ETA for the route overlay, in seconds. */
  routeEtaSeconds?: number | null;
  className?: string;
}

export default function LiveCorridorMap({
  isActive,
  corridorId,
  corridorName,
  pickupStage = null,
  journeyResults,
  highlightNganyaId = null,
  onTrackNganya,
  compact = false,
  dense = false,
  fillRowHeight = false,
  emptyOverlay = null,
  showNoCorridorOverlay = true,
  showCaption = true,
  flushBottom = false,
  routeLine = null,
  routeEtaSeconds = null,
  className,
}: LiveCorridorMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [pins, setPins] = useState<CorridorNganyaMapPin[]>([]);
  const [stagePos, setStagePos] = useState<TrackingPosition | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { coords: userCoords } = useGeolocationStream();

  const loadPins = useCallback(async () => {
    if (!corridorId) {
      setPins([]);
      return;
    }
    try {
      setLoadError(null);
      const data = await fetchCorridorNganyaMapPins(corridorId);
      setPins(data);
    } catch {
      setLoadError("Could not load matatu positions");
    }
  }, [corridorId]);

  useEffect(() => {
    if (!isActive) return;
    if (!corridorId) {
      setPins([]);
      setStagePos(null);
      return;
    }
    void loadPins();
    if (pickupStage?.id) {
      fetchStagePosition(pickupStage.id)
        .then(setStagePos)
        .catch(() => setStagePos(null));
    } else {
      setStagePos(null);
    }
  }, [isActive, corridorId, pickupStage?.id, loadPins]);

  useEffect(() => {
    if (!isActive || !corridorId) return;

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => loadPins(), 900);
    };

    const channel = supabase
      .channel(`live_corridor_map_${corridorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `corridor_id=eq.${corridorId}`,
        },
        schedule,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sightings",
          filter: `corridor_id=eq.${corridorId}`,
        },
        schedule,
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [isActive, corridorId, loadPins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isActive) return;

    const points: TrackingPosition[] = pins.map((p) => p.position);
    if (stagePos) points.push(stagePos);
    if (userCoords) points.push({ lat: userCoords.lat, lng: userCoords.lng });

    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo({
        center: [points[0].lng, points[0].lat],
        zoom: 15,
        duration: 500,
      });
      return;
    }

    const lngs = points.map((p) => p.lng);
    const lats = points.map((p) => p.lat);
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
    );
  }, [isActive, pins, stagePos, userCoords?.lat, userCoords?.lng]);

  // Route overlay (e.g. OSRM) rendered imperatively to avoid style-spec prop leakage
  // through the React <Source> wrapper (which was producing invalid source props).
  useEffect(() => {
    const map = (mapRef.current as any)?.getMap?.() ?? (mapRef.current as any);
    if (!map) return;

    const sourceId = "nganya-stage-route";
    const shadowLayerId = "nganya-stage-route-shadow";
    const lineLayerId = "nganya-stage-route-line";

    const ensureRemoved = () => {
      try {
        if (map.getLayer?.(lineLayerId)) map.removeLayer(lineLayerId);
      } catch {
        // Layer may already be gone during style refreshes/unmount.
      }
      try {
        if (map.getLayer?.(shadowLayerId)) map.removeLayer(shadowLayerId);
      } catch {
        // Layer may already be gone during style refreshes/unmount.
      }
      try {
        if (map.getSource?.(sourceId)) map.removeSource(sourceId);
      } catch {
        // Source may already be gone during style refreshes/unmount.
      }
    };

    if (!routeLine?.coordinates?.length) {
      ensureRemoved();
      return;
    }

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeLine.coordinates,
          },
        },
      ],
    } as const;

    const apply = () => {
      // Update or add the source.
      const existing = map.getSource?.(sourceId);
      if (existing?.setData) {
        existing.setData(geojson);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geojson });
      }

      // Add layers if missing; keep them above the basemap.
      // Prefer inserting below the first symbol layer (labels), so the route sits under labels.
      const layers = map.getStyle?.()?.layers ?? [];
      const firstSymbol = layers.find((l: any) => l?.type === "symbol")?.id;
      const beforeId = typeof firstSymbol === "string" ? firstSymbol : undefined;
      if (!map.getLayer?.(shadowLayerId)) {
        map.addLayer({
          id: shadowLayerId,
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "rgba(0,0,0,0.55)",
            "line-width": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 16],
            "line-blur": 1.2,
            "line-opacity": 0.9,
          },
        }, beforeId);
      }
      if (!map.getLayer?.(lineLayerId)) {
        map.addLayer({
          id: lineLayerId,
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#ff2d78",
            "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 14, 10],
            "line-blur": 0.2,
            "line-opacity": 0.95,
          },
        }, beforeId);
      }
    };

    // Apply immediately if possible, and re-apply on any style refresh.
    // MapLibre can drop custom layers when the style is reinitialized.
    const onStyle = () => apply();
    if (map.isStyleLoaded?.()) apply();
    map.on?.("styledata", onStyle);

    return () => {
      try {
        map.off?.("styledata", onStyle);
      } catch {
        // Listener may already be detached during teardown.
      }
      ensureRemoved();
    };
  }, [routeLine?.coordinates]);

  const heightClass = dense
      ? "min-h-[220px] h-[min(38vh,320px)]"
      : compact
        ? "min-h-[260px] h-[min(42vh,360px)]"
        : "min-h-[320px] h-[min(62vh,640px)]";

  if (!isActive) return null;

  const mapFrameRadius = flushBottom
    ? "rounded-t-[var(--radius-lg)] rounded-b-none"
    : "rounded-[var(--radius-lg)]";

  const liveCount = pins.filter((p) => p.pin_source === "LIVE").length;
  const sightCount = pins.filter((p) => p.pin_source === "SIGHTING").length;

  return (
    <div
      className={[
        fillRowHeight
          ? "mb-0 flex h-full w-full min-h-0 shrink-0 flex-col"
          : "mb-0 shrink-0",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showCaption ? (
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-green)] animate-pulse" />
            {corridorId ? `${pins.length} on map` : "Map"}
          </span>
          {corridorId && liveCount > 0 ? (
            <span className="text-[var(--color-green)]">
              {liveCount} live GPS
            </span>
          ) : null}
          {corridorId && sightCount > 0 ? (
            <span className="text-[var(--color-text-tertiary)]">
              {sightCount} from sightings
            </span>
          ) : null}
          {corridorId ? (
            <span className="text-[var(--color-text-tertiary)]">
              — tap a matatu to track
            </span>
          ) : null}
        </p>
      ) : null}
      <div
        className={[
          "relative w-full overflow-hidden",
          mapFrameRadius,
          fillRowHeight ? "flex-1 min-h-0" : heightClass,
        ].join(" ")}
      >
        {loadError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-body)]/92 text-xs text-[var(--color-text-secondary)] px-4 text-center">
            {loadError}
          </div>
        ) : null}
        <div className="h-full w-full">
          <Map
            ref={mapRef}
            initialViewState={{
              latitude: DEFAULT_CENTER.lat,
              longitude: DEFAULT_CENTER.lng,
              zoom: 14,
            }}
            style={{ width: "100%", height: "100%" }}
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
            {stagePos && pickupStage ? (
              <Marker
                longitude={stagePos.lng}
                latitude={stagePos.lat}
                anchor="bottom"
              >
                <StageMarker name={pickupStage.name} size={36} />
              </Marker>
            ) : null}
            {pins.map((pin) => {
              const signal = markerSignalForPin(pin);
              return (
                <Marker
                  key={`${pin.nganya_id}-${pin.pin_source}`}
                  longitude={pin.position.lng}
                  latitude={pin.position.lat}
                  anchor="bottom"
                >
                  <button
                    type="button"
                    title={`${pin.nganya_name}${pin.pin_source === "SIGHTING" ? " (sighting)" : ""}`}
                    onClick={() =>
                      corridorId
                        ? onTrackNganya(
                            buildJourneyFromPin(
                              pin,
                              corridorId,
                              corridorName,
                              journeyResults,
                            ),
                          )
                        : undefined
                    }
                    className="cursor-pointer bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 rounded-full"
                    aria-label={`Track ${pin.nganya_name}`}
                  >
                    <span
                      className={
                        highlightNganyaId === pin.nganya_id
                          ? "block scale-110 drop-shadow-[0_0_14px_rgba(255,45,120,0.85)]"
                          : "block"
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
              );
            })}
          </Map>
        </div>
        {routeEtaSeconds && Number.isFinite(routeEtaSeconds) ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[6] rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
            ETA {Math.max(1, Math.round(routeEtaSeconds / 60))} min
          </div>
        ) : null}
        {showNoCorridorOverlay && !corridorId && !loadError ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-[var(--color-bg-body)]/80 px-4 text-center text-xs text-[var(--color-text-secondary)] backdrop-blur-sm">
            {emptyOverlay ??
              "Pick a route in the planner (or use route chips below) to load live matatus."}
          </div>
        ) : null}
        {corridorId && pins.length === 0 && !loadError ? (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-2 text-center text-[11px] text-white/90 backdrop-blur-sm">
            No Active nganyas on this route yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
