import type { Coords, StageOption, StartStageChoice } from "./crew-live-types";

export function clampSeats(value: number, max = 33) {
  return Math.max(0, Math.min(max, value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export function getDirectionLabels(corridorName: string | null | undefined) {
  return {
    toTown: "-> Town",
    fromTown: corridorName ? `-> ${corridorName}` : "-> Terminal",
  };
}

export function parsePoint(
  location: unknown,
): { lat: number; lng: number } | null {
  if (!location) return null;

  if (typeof location === "string") {
    const pointMatch = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (pointMatch) {
      return { lng: Number(pointMatch[1]), lat: Number(pointMatch[2]) };
    }

    try {
      const parsed = JSON.parse(location);
      if (
        parsed?.type === "Point" &&
        Array.isArray(parsed.coordinates) &&
        parsed.coordinates.length >= 2
      ) {
        return {
          lng: Number(parsed.coordinates[0]),
          lat: Number(parsed.coordinates[1]),
        };
      }
    } catch {
      return null;
    }
  }

  if (typeof location === "object" && location !== null) {
    const geo = location as any;
    if (
      geo?.type === "Point" &&
      Array.isArray(geo.coordinates) &&
      geo.coordinates.length >= 2
    ) {
      return {
        lng: Number(geo.coordinates[0]),
        lat: Number(geo.coordinates[1]),
      };
    }

    if (typeof geo.lat === "number" && typeof geo.lng === "number") {
      return { lat: geo.lat, lng: geo.lng };
    }

    if (typeof geo.latitude === "number" && typeof geo.longitude === "number") {
      return { lat: geo.latitude, lng: geo.longitude };
    }
  }

  return null;
}

export function getDistanceKm(from: Coords, to: { lat: number; lng: number }) {
  const toRad = (degrees: number) => degrees * (Math.PI / 180);
  const earthKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(a));
}

export function detectNearestStage(
  stages: StageOption[],
  coords: Coords | null,
): StartStageChoice | null {
  if (!coords || !stages.length) return null;

  let bestStage: StageOption | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const stage of stages) {
    const stagePoint = parsePoint(stage.location);
    if (!stagePoint) continue;

    const distance = getDistanceKm(coords, stagePoint);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestStage = stage;
    }
  }

  if (!bestStage) return null;

  return {
    id: bestStage.id,
    name: bestStage.name,
    source: "auto",
  };
}

export function getLocationPoint(coords: Coords) {
  return `POINT(${coords.lng} ${coords.lat})`;
}

export function getGpsQuality(
  accuracy: number | null,
): "good" | "weak" | null {
  if (accuracy == null || !Number.isFinite(accuracy)) return null;
  return accuracy <= 50 ? "good" : "weak";
}
