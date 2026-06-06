import type { PlannerRideOption } from "@/modules/fan/services/planner-assist";
import type { PlannerRiskPrompt } from "./home-types";

export function buildPlannerJourneyKey(params: {
  plannerCorridorId: string | null;
  plannerStageId: string | null;
  preference: "ANY" | "NEWEST" | "SPECIFIC";
  preferredNganyaId?: string | null;
}) {
  if (!params.plannerCorridorId || !params.plannerStageId) return null;
  const preferredId =
    params.preference === "SPECIFIC" ? params.preferredNganyaId || "" : "";
  return `${params.plannerCorridorId}:${params.plannerStageId}:${params.preference}:${preferredId}`;
}

export function shouldResetPlannerResults(
  previousKey: string | null,
  nextKey: string,
) {
  if (!previousKey) return false;
  return (
    previousKey.split(":").slice(0, 2).join(":") !==
    nextKey.split(":").slice(0, 2).join(":")
  );
}

export function buildPlannerRouteCacheKey(params: {
  rideId: string;
  stageId: string;
  nganyaPos: { lat: number; lng: number };
  stagePos: { lat: number; lng: number };
}) {
  return `${params.rideId}:${params.stageId}:${params.nganyaPos.lng.toFixed(5)},${params.nganyaPos.lat.toFixed(5)}:${params.stagePos.lng.toFixed(5)},${params.stagePos.lat.toFixed(5)}`;
}

export function getPlannerRiskPrompt(params: {
  watchedRideId: string | null;
  watchedRide: PlannerRideOption | null;
  backupRides: PlannerRideOption[];
  dismissedRiskKey: string | null;
}): PlannerRiskPrompt | null {
  const { watchedRideId, watchedRide, backupRides, dismissedRiskKey } = params;
  if (!watchedRideId) return null;

  const alternative = backupRides[0] || null;
  const nextPrompt = !watchedRide
    ? {
        key: `${watchedRideId}:missing:${alternative?.nganya_id || "none"}`,
        reason: "missing" as const,
        alternative,
      }
    : watchedRide.catchability.status === "STALE_UNCERTAIN"
      ? {
          key: `${watchedRide.nganya_id}:stale:${alternative?.nganya_id || "none"}`,
          reason: "stale" as const,
          alternative,
        }
      : watchedRide.catchability.status !== "CATCHABLE"
        ? {
            key: `${watchedRide.nganya_id}:risky:${alternative?.nganya_id || "none"}`,
            reason: "risky" as const,
            alternative,
          }
        : null;

  if (!nextPrompt) return null;
  if (dismissedRiskKey === nextPrompt.key) return null;
  return nextPrompt;
}
