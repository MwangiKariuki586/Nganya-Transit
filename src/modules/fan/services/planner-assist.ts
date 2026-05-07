import { computeCatchability } from "@/lib/tracking-catchability";
import { getAgeSeconds, getTrackingSignalState, SIGNAL_RANK } from "@/lib/tracking-signal";
import type { JourneyResult } from "@/lib/types/journey";
import type {
  CatchabilityResult,
  CatchabilityStatus,
  TrackingSignalType,
} from "@/lib/types/tracking";

export interface PlannerRideOption extends JourneyResult {
  signalType: TrackingSignalType;
  freshnessSeconds: number | null;
  catchability: CatchabilityResult;
}

export type PlannerAssistStatus = "idle" | "no_matches" | "watchable" | "risky" | "stale";

const CATCHABILITY_RANK: Record<CatchabilityStatus, number> = {
  CATCHABLE: 1,
  RISKY: 2,
  TOO_FAR: 3,
  STALE_UNCERTAIN: 4,
};

export function toPlannerRideOption(result: JourneyResult): PlannerRideOption {
  const observedAt = result.last_seen_at || null;
  const signalType = observedAt
    ? getTrackingSignalState(result.source, observedAt)
    : result.source === "LIVE"
      ? "LIVE"
      : "STALE";
  const freshnessSeconds = observedAt ? getAgeSeconds(observedAt) : null;

  return {
    ...result,
    signalType,
    freshnessSeconds,
    catchability: computeCatchability({
      etaMinutes: Number.isFinite(result.eta_minutes) ? result.eta_minutes : 99,
      walkTimeMinutes: null,
      signalType,
      confidence: result.confidence_level,
    }),
  };
}

export function sortPlannerRideOptions(results: JourneyResult[]): PlannerRideOption[] {
  return results
    .map(toPlannerRideOption)
    .sort((left, right) => {
      const catchabilityDelta =
        CATCHABILITY_RANK[left.catchability.status] -
        CATCHABILITY_RANK[right.catchability.status];
      if (catchabilityDelta !== 0) return catchabilityDelta;

      const signalDelta = SIGNAL_RANK[left.signalType] - SIGNAL_RANK[right.signalType];
      if (signalDelta !== 0) return signalDelta;

      return left.eta_minutes - right.eta_minutes;
    });
}

export function getPlannerAssistStatus(
  options: PlannerRideOption[],
  watchedRideId: string | null,
): PlannerAssistStatus {
  if (options.length === 0) return "no_matches";

  const watched = watchedRideId
    ? options.find((option) => option.nganya_id === watchedRideId) || null
    : null;
  const primary = watched || options[0];

  if (primary.catchability.status === "STALE_UNCERTAIN") return "stale";
  if (primary.catchability.status !== "CATCHABLE") return "risky";
  return "watchable";
}
