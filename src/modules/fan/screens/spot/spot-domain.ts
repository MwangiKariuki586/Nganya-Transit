import type { Dispatch, SetStateAction } from "react";
import { formatRelativeTime } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";
import type { FanCorridorRecord } from "@/modules/fan/lib/fan-data";
import type {
  PlannerPlace,
  CorridorSuggestion,
  StageMatch,
  SpotCandidate,
  SpotDraft,
  SignalQuality,
  QualitySummary,
} from "./spot-types";

export function readStoredJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function getPlannerSuggestion(
  corridors: FanCorridorRecord[],
): CorridorSuggestion {
  const place = readStoredJson<PlannerPlace>("whereto_toPlace");
  if (!place) return { corridorId: null, corridorName: null, source: null };

  const corridorId = place.corridor_id || place.id;
  const corridor = corridors.find((item) => item.id === corridorId);

  return {
    corridorId: corridor?.id || null,
    corridorName: corridor?.name || place.name || null,
    source: corridor ? "planner" : null,
  };
}

export function getDirectionOptions(corridorName: string | null) {
  const terminal = corridorName || "Terminal";
  return [
    { value: "TOWN", label: "-> Town" },
    { value: "TERMINAL", label: `-> ${terminal}` },
  ];
}

export function getSignalCue(candidate: SpotCandidate) {
  if (candidate.liveCue) return "Live on this route";
  if (candidate.lastSeenAt)
    return `Seen ${formatRelativeTime(candidate.lastSeenAt)}`;
  if (candidate.isFollowed) return "You follow this build";
  return `Popular on this route`;
}

export function formatDistance(distance: number | null | undefined) {
  if (!Number.isFinite(distance ?? NaN)) return null;
  if ((distance || 0) < 1000) return `${Math.round(distance || 0)}m`;
  return `${((distance || 0) / 1000).toFixed(1)}km`;
}

export function buildQualitySummary(params: {
  corridorName: string | null;
  direction: string | null;
  photoName: string | null;
  evidenceTags: string[];
  locationGranted: boolean;
  corridorFit: boolean;
  corridorDistance: number | null;
  corroborationMinutes: number | null;
  duplicatePenalty: boolean;
}): QualitySummary {
  const factors = [
    {
      label: "Route selected",
      passed: Boolean(params.corridorName),
      detail: params.corridorName || "Pick a route",
    },
    {
      label: "Direction set",
      passed: Boolean(params.direction),
      detail: params.direction
        ? "Structured route direction added"
        : "Choose a direction",
    },
    {
      label: "Live location on submit",
      passed: params.locationGranted,
      detail: params.locationGranted
        ? "Real device location available"
        : "Location still pending",
    },
    {
      label: "Location fits route",
      passed: params.corridorFit,
      detail: params.corridorFit
        ? params.corridorDistance !== null
          ? `Within ${formatDistance(params.corridorDistance) || "route fit"}`
          : "Route fit verified"
        : "Fit still uncertain",
    },
    {
      label: "Photo evidence",
      passed: Boolean(params.photoName),
      detail: params.photoName ? "Photo attached" : "No photo attached",
    },
    {
      label: "Context added",
      passed: params.evidenceTags.length > 0,
      detail:
        params.evidenceTags.length > 0
          ? `${params.evidenceTags.length} context tag${params.evidenceTags.length === 1 ? "" : "s"}`
          : "No context tags yet",
    },
    {
      label: "Recent corroboration",
      passed:
        params.corroborationMinutes !== null &&
        params.corroborationMinutes <= 10,
      detail:
        params.corroborationMinutes !== null
          ? `Another fan spotted it ${params.corroborationMinutes}m ago`
          : "No recent corroboration",
    },
  ];

  let score = 0;
  if (params.locationGranted) score += 30;
  if (params.corridorFit) score += 25;
  if (params.direction) score += 10;
  if (params.photoName) score += 15;
  if (params.evidenceTags.length > 0) score += 10;
  if (params.corroborationMinutes !== null && params.corroborationMinutes <= 10)
    score += 15;
  if (params.duplicatePenalty) score -= 25;

  const reasons: string[] = [];
  if (params.locationGranted && params.corridorFit)
    reasons.push("Verified route fit");
  if (params.direction) reasons.push("Direction set");
  if (params.photoName) reasons.push("Photo evidence");
  if (params.corroborationMinutes !== null && params.corroborationMinutes <= 10)
    reasons.push("Recent corroboration");
  if (params.duplicatePenalty) reasons.push("Repeat spotting penalty");

  let level: SignalQuality = "LOW";
  if (
    params.locationGranted &&
    params.corridorFit &&
    params.direction &&
    (Boolean(params.photoName) ||
      (params.corroborationMinutes !== null &&
        params.corroborationMinutes <= 10)) &&
    !params.duplicatePenalty
  ) {
    level = "HIGH";
  } else if (params.locationGranted && params.corridorFit && params.direction) {
    level = "MEDIUM";
  }

  return { level, score, reasons, factors };
}

export async function findClosestStagesForCorridor(
  corridorId: string,
  lat: number,
  lng: number,
) {
  const { data, error } = await supabase.rpc("closest_stages", {
    p_corridor_id: corridorId,
    p_lat: lat,
    p_lng: lng,
    p_limit: 3,
    p_max_meters: 5000,
  });

  if (error) throw error;
  return (data || []) as StageMatch[];
}

export function getRouteFitMessage(distance: number | null) {
  if (distance === null) return "Route fit will be checked on submit";
  if (distance <= 350)
    return `Strong route fit - nearest stage ${formatDistance(distance)} away`;
  if (distance <= 1200)
    return `Usable route fit - nearest stage ${formatDistance(distance)} away`;
  return `Route fit uncertain - nearest stage ${formatDistance(distance)} away`;
}

export function clearPhotoSelection(params: {
  selectedPhotoPreviewUrl: string | null;
  setSelectedPhotoName: Dispatch<SetStateAction<string | null>>;
  setSelectedPhotoPreviewUrl: Dispatch<SetStateAction<string | null>>;
  setDraft: Dispatch<SetStateAction<SpotDraft>>;
}) {
  if (params.selectedPhotoPreviewUrl) {
    URL.revokeObjectURL(params.selectedPhotoPreviewUrl);
  }

  params.setSelectedPhotoName(null);
  params.setSelectedPhotoPreviewUrl(null);
  params.setDraft((current) => ({
    ...current,
    photoName: null,
  }));
}
