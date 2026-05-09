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
import {
  getTrackingSignalState,
  isLiveForCount,
  isVisibleOnLiveMap,
  ROUTE_LINE_VISUAL,
  formatAgeShort,
  getAgeSeconds,
} from "@/lib/tracking-signal";
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

/** Format metres into a compact human-readable distance string. */
function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/**
 * Resolve the signal state for a corridor map pin using the canonical helper.
 * EXPIRED pins are filtered at the query layer, but we guard here too.
 */
function markerSignalForPin(pin: CorridorNganyaMapPin): TrackingSignalType {
  return getTrackingSignalState(pin.pin_source, pin.observed_at);
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
  /** Optional route distance in metres, shown alongside ETA on the map badge. */
  routeDistanceMeters?: number | null;
  /**
   * Signal state of the nganya whose route is being shown.
   * Controls route line colour, opacity, and dash pattern.
   * Defaults to 'LIVE' when not provided (preserves existing behaviour).
   */
  routeSignalType?: TrackingSignalType | null;
  /**
   * When true, shows a rerouting loading overlay on the map.
   * Set by the parent while an OSRM/route fetch is in-flight after a marker click.
   */
  isRouting?: boolean;
  className?: string;
  /** Optional pin filter: when set, only these nganya ids are rendered. */
  visibleNganyaIds?: string[] | null;
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
  routeDistanceMeters = null,
  routeSignalType = null,
  isRouting = false,
  className,
  visibleNganyaIds = null,
}: LiveCorridorMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [pins, setPins] = useState<CorridorNganyaMapPin[]>([]);
  const [stagePos, setStagePos] = useState<TrackingPosition | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { coords: userCoords } = useGeolocationStream({
    enabled: isActive && Boolean(corridorId),
  });

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
      // Resolve route line visual config from signal state
      const lineVisual = ROUTE_LINE_VISUAL[routeSignalType ?? "LIVE"];

      // Update or add the source.
      const existing = map.getSource?.(sourceId);
      if (existing?.setData) {
        existing.setData(geojson);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geojson });
      }

      // Prefer inserting below the first symbol layer so the route sits under labels.
      const layers = map.getStyle?.()?.layers ?? [];
      const firstSymbol = layers.find((l: any) => l?.type === "symbol")?.id;
      const beforeId =
        typeof firstSymbol === "string" ? firstSymbol : undefined;

      // ── Shadow layer ──────────────────────────────────────────────────────
      if (!map.getLayer?.(shadowLayerId)) {
        map.addLayer(
          {
            id: shadowLayerId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "rgba(0,0,0,0.55)",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                10,
                14,
                16,
              ],
              "line-blur": 1.2,
              "line-opacity": lineVisual.shadowOpacity,
            },
          },
          beforeId,
        );
      } else {
        // Layer already exists — update only the opacity (avoids a remove/add race)
        map.setPaintProperty?.(
          shadowLayerId,
          "line-opacity",
          lineVisual.shadowOpacity,
        );
      }

      // ── Main line layer ───────────────────────────────────────────────────
      if (!map.getLayer?.(lineLayerId)) {
        const linePaint: Record<string, unknown> = {
          "line-color": lineVisual.color,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 14, 10],
          "line-blur": 0.2,
          "line-opacity": lineVisual.opacity,
        };
        if (lineVisual.dasharray) {
          linePaint["line-dasharray"] = lineVisual.dasharray;
        }
        map.addLayer(
          {
            id: lineLayerId,
            type: "line",
            source: sourceId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: linePaint,
          },
          beforeId,
        );
      } else {
        // Layer already exists — update paint properties in-place
        map.setPaintProperty?.(lineLayerId, "line-color", lineVisual.color);
        map.setPaintProperty?.(lineLayerId, "line-opacity", lineVisual.opacity);
        map.setPaintProperty?.(
          lineLayerId,
          "line-dasharray",
          lineVisual.dasharray ?? ["literal", [1, 0]],
        );
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
  }, [routeLine?.coordinates, routeSignalType]);

  const heightClass = dense
    ? "min-h-[220px] h-[min(38vh,320px)]"
    : compact
      ? "min-h-[260px] h-[min(42vh,360px)]"
      : "min-h-[320px] h-[min(62vh,640px)]";

  if (!isActive) return null;

  const mapFrameRadius = flushBottom
    ? "rounded-t-[var(--radius-lg)] rounded-b-none"
    : "rounded-[var(--radius-lg)]";

  const visibleIdSet =
    visibleNganyaIds && visibleNganyaIds.length > 0
      ? new Set(visibleNganyaIds)
      : null;

  const visiblePins = visibleIdSet
    ? pins.filter((p) => visibleIdSet.has(p.nganya_id))
    : pins;

  // ── Signal-aware counts — stale/expired must never inflate live metrics ──
  const liveCount = visiblePins.filter((p) =>
    isLiveForCount(markerSignalForPin(p)),
  ).length;
  const estimatedCount = visiblePins.filter((p) => {
    const s = markerSignalForPin(p);
    return s === "ESTIMATED";
  }).length;
  const staleCount = visiblePins.filter(
    (p) => markerSignalForPin(p) === "STALE",
  ).length;
  // True when the map has pins but none are live or estimated
  const onlyStaleAvailable =
    visiblePins.length > 0 && liveCount === 0 && estimatedCount === 0;
  const hasRouteEta =
    !!routeEtaSeconds &&
    Number.isFinite(routeEtaSeconds) &&
    routeSignalType !== "STALE" &&
    routeSignalType !== "EXPIRED" &&
    !onlyStaleAvailable;

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
            {corridorId ? `${visiblePins.length} on map` : "Map"}
          </span>
          {corridorId && liveCount > 0 ? (
            <span className="text-[var(--color-green)]">
              {liveCount} live GPS
            </span>
          ) : null}
          {corridorId && estimatedCount > 0 ? (
            <span className="text-[var(--color-text-tertiary)]">
              {estimatedCount} from sightings
            </span>
          ) : null}
          {corridorId &&
          staleCount > 0 &&
          liveCount === 0 &&
          estimatedCount === 0 ? (
            <span className="text-[var(--color-text-tertiary)]">
              {staleCount} last-known
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
            onLoad={() => setMapReady(true)}
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
            {visiblePins.map((pin) => {
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
                          ? "block scale-110 drop-shadow-[0_0_14px_var(--color-accent)]"
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

        {/* ── Initial map tile load ─────────────────────────────────────── */}
        {!mapReady && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ backgroundColor: "var(--color-bg-body)" }}
            aria-label="Map loading"
            aria-live="polite"
          >
            {/* Animated map-pin skeleton */}
            <div className="relative flex items-center justify-center">
              <span
                className="absolute w-14 h-14 rounded-full animate-ping"
                style={{
                  backgroundColor: "var(--color-accent)",
                  opacity: 0.12,
                }}
              />
              <span
                className="relative w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--color-accent)" }}
              />
            </div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Loading map…
            </p>
          </div>
        )}

        {/* ── Rerouting overlay — shown while OSRM fetch is in-flight ─────── */}
        {mapReady && isRouting && (
          <div
            className="pointer-events-none absolute inset-0 z-10"
            aria-label="Calculating route"
            aria-live="polite"
          >
            {/* Subtle dark veil so the map stays visible underneath */}
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(10,10,15,0.35)" }}
            />
            {/* Pill badge centred on the map */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(10,10,15,0.88)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                  style={{ borderColor: "var(--color-accent)" }}
                />
                Calculating route…
              </div>
            </div>
          </div>
        )}
        {hasRouteEta ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[6] rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm flex items-center gap-2">
            <span>
              {routeSignalType === "ESTIMATED"
                ? `~${Math.max(1, Math.round(routeEtaSeconds / 60))} min estimate`
                : `ETA ${Math.max(1, Math.round(routeEtaSeconds / 60))} min`}
            </span>
            {routeDistanceMeters && Number.isFinite(routeDistanceMeters) ? (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ opacity: 0.85 }}>
                  {formatDistance(routeDistanceMeters)}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
        {/* Stale-only notice — subtle map-level badge when no fresh signals exist */}
        {onlyStaleAvailable && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[6] rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm whitespace-nowrap">
            No fresh live signals · Showing last-known locations
          </div>
        )}
        {showNoCorridorOverlay && !corridorId && !loadError ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-[var(--color-bg-body)]/80 px-4 text-center text-xs text-[var(--color-text-secondary)] backdrop-blur-sm">
            {emptyOverlay ??
              "Pick a route in the planner (or use route chips below) to load live matatus."}
          </div>
        ) : null}
        {corridorId && visiblePins.length === 0 && !loadError ? (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-2 text-center text-[11px] text-white/90 backdrop-blur-sm">
            No Active nganyas on this route yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
