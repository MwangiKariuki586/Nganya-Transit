import {
  formatDirectionLabel,
  formatRelativeTime,
  toNganyaSlug,
} from "@/lib/formatters";
import type {
  AggregatedRecentSightingRow,
  RecentSightingFilter,
} from "./home-types";

function getMinutesSince(isoDate: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000),
  );
}

function getRecencyTone(minutes: number): "hot" | "warm" | "stale" {
  if (minutes <= 2) return "hot";
  if (minutes <= 15) return "warm";
  return "stale";
}

export function getRecencyLabel(minutes: number, isoDate: string) {
  if (minutes <= 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  return formatRelativeTime(isoDate);
}

export function filterRecentSightingsByCorridor(params: {
  recentSightings: any[];
  activeCorridor: string | null;
  activeCorridorName: string | null;
}) {
  const { recentSightings, activeCorridor, activeCorridorName } = params;
  if (!activeCorridor) return recentSightings;

  const routeName = (activeCorridorName || "").toLowerCase();
  return recentSightings.filter((s: any) => {
    if (s.corridor_id) return s.corridor_id === activeCorridor;
    const label = (s.corridor || s.corridor_name || "").toLowerCase();
    if (!routeName) return false;
    return label.includes(routeName) || routeName.includes(label);
  });
}

export function aggregateRecentSightings(params: {
  sightings: any[];
  activeCorridor: string | null;
  corridors: any[];
}) {
  const grouped = new Map<string, AggregatedRecentSightingRow>();
  const recentUserKeysByGroup = new Map<string, Set<string>>();
  const corridorNameById = new Map(
    (params.corridors || []).map((corridor: any) => [
      corridor.id,
      corridor.name,
    ]),
  );

  for (const sighting of params.sightings) {
    const nganyaId = sighting.nganya_id || sighting.nganyaId;
    if (!nganyaId) continue;

    const corridorId = sighting.corridor_id || null;
    const corridorName =
      sighting.nganya?.corridors?.name ||
      (corridorId ? corridorNameById.get(corridorId) : null) ||
      sighting.corridor_name ||
      sighting.corridor ||
      "Route unavailable";
    const direction = sighting.direction || null;
    const key = `${nganyaId}:${corridorId || "unknown"}:${direction || "unknown"}`;
    const lastSeenAt = sighting.created_at;
    if (!lastSeenAt) continue;

    const lastSeenMinutes = getMinutesSince(lastSeenAt);
    if (lastSeenMinutes > 15) continue;

    const authorKey = sighting.user?.handle || sighting.user_id || "anonymous";
    const existing = grouped.get(key);

    if (!existing) {
      const sightingsCountRecent = 1;
      const distinctUsersCount = 1;
      const confidenceLevel =
        lastSeenMinutes <= 2 ? "HIGH" : lastSeenMinutes <= 15 ? "MED" : "LOW";
      const signalLabel =
        confidenceLevel === "HIGH" ? "Live signal" : "Seen recently";

      grouped.set(key, {
        key,
        nganyaId,
        slug: toNganyaSlug(
          sighting.nganya?.name || sighting.nganyaName || "nganya",
        ),
        nganyaName:
          sighting.nganya?.name || sighting.nganyaName || "Unknown nganya",
        corridorId,
        corridorName,
        direction,
        directionLabel: formatDirectionLabel(direction, corridorName),
        stageName: sighting.stage?.name || null,
        lastSeenAt,
        lastSeenMinutes,
        sightingsCountRecent,
        distinctUsersCount,
        confidenceLevel,
        signalLabel,
        statusTone: getRecencyTone(lastSeenMinutes),
        onRoute: Boolean(
          params.activeCorridor && corridorId === params.activeCorridor,
        ),
      });
      recentUserKeysByGroup.set(key, new Set([authorKey]));
      continue;
    }

    const isNewer =
      new Date(lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime();
    const updatedRecentCount = existing.sightingsCountRecent + 1;
    const recentUserKeys = recentUserKeysByGroup.get(key) || new Set<string>();
    recentUserKeys.add(authorKey);
    recentUserKeysByGroup.set(key, recentUserKeys);
    const distinctUsersCount = recentUserKeys.size;

    const referenceMinutes = isNewer
      ? lastSeenMinutes
      : existing.lastSeenMinutes;
    const confidenceLevel =
      updatedRecentCount >= 2 || distinctUsersCount >= 2
        ? "HIGH"
        : referenceMinutes <= 15
          ? "MED"
          : "LOW";

    const signalLabel =
      distinctUsersCount >= 2
        ? `${distinctUsersCount} riders confirmed`
        : updatedRecentCount >= 2
          ? `${updatedRecentCount} sightings`
          : confidenceLevel === "HIGH"
            ? "Just spotted"
            : confidenceLevel === "MED"
              ? "Seen recently"
              : "Low activity";

    grouped.set(key, {
      ...existing,
      stageName: isNewer
        ? sighting.stage?.name || existing.stageName
        : existing.stageName,
      lastSeenAt: isNewer ? lastSeenAt : existing.lastSeenAt,
      lastSeenMinutes: Math.min(existing.lastSeenMinutes, lastSeenMinutes),
      statusTone: getRecencyTone(
        Math.min(existing.lastSeenMinutes, lastSeenMinutes),
      ),
      sightingsCountRecent: updatedRecentCount,
      distinctUsersCount,
      confidenceLevel,
      signalLabel,
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.onRoute !== right.onRoute) return left.onRoute ? -1 : 1;
    return (
      new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime()
    );
  });
}

export function filterAggregatedRecentSightings(
  sightings: AggregatedRecentSightingRow[],
  recentFilter: RecentSightingFilter,
) {
  if (recentFilter === "ON_ROUTE") {
    return sightings.filter((row) => row.onRoute);
  }
  if (recentFilter === "HIGH_ACTIVITY") {
    return sightings.filter(
      (row) => row.sightingsCountRecent >= 2 || row.distinctUsersCount >= 2,
    );
  }
  return sightings;
}

export function countOnRouteRecentSightings(
  sightings: AggregatedRecentSightingRow[],
) {
  return sightings.filter((row) => row.onRoute).length;
}

export function countHighActivityRecentSightings(
  sightings: AggregatedRecentSightingRow[],
) {
  return sightings.filter(
    (row) => row.sightingsCountRecent >= 2 || row.distinctUsersCount >= 2,
  ).length;
}
