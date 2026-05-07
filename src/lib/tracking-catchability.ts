import type { ConfidenceLevel } from "@/lib/types/journey";
import type {
  CatchabilityResult,
  TrackingSignalType,
} from "@/lib/types/tracking";
import { TRACKING_THRESHOLDS } from "@/lib/types/tracking";

export function computeCatchability(params: {
  etaMinutes: number;
  walkTimeMinutes: number | null;
  signalType: TrackingSignalType;
  confidence: ConfidenceLevel;
}): CatchabilityResult {
  const { etaMinutes, walkTimeMinutes, signalType, confidence } = params;

  if (signalType === "EXPIRED") {
    return {
      status: "STALE_UNCERTAIN",
      label: "Signal expired",
      subtext: "This signal is too old - find alternatives",
    };
  }

  if (signalType === "STALE") {
    return {
      status: "STALE_UNCERTAIN",
      label: "Tracking stale",
      subtext: "Signal lost - consider alternatives",
    };
  }

  if (confidence === "LOW" && signalType === "ESTIMATED") {
    return {
      status: "STALE_UNCERTAIN",
      label: "Low confidence",
      subtext: "Estimate uncertain - consider alternatives",
    };
  }

  if (walkTimeMinutes !== null) {
    const buffer = TRACKING_THRESHOLDS.LEAVE_BUFFER_MIN;
    const margin = etaMinutes - walkTimeMinutes - buffer;

    if (margin < 0) {
      return {
        status: "TOO_FAR",
        label: "Too far",
        subtext: "Better options may be available",
      };
    }

    if (margin < 3) {
      return {
        status: "RISKY",
        label: "Risky - start moving now",
        subtext: `Only ~${Math.max(0, Math.round(margin))} min margin`,
      };
    }

    return {
      status: "CATCHABLE",
      label: "Catchable",
      subtext: `~${Math.round(margin)} min before you need to leave`,
    };
  }

  if (etaMinutes <= 2) {
    return {
      status: "RISKY",
      label: "Arriving soon",
      subtext: "Get to the stage now",
    };
  }

  return {
    status: "CATCHABLE",
    label: "Catchable - likely arriving soon",
    subtext:
      signalType === "ESTIMATED" ? "Sightings-based estimate" : "Live signal active",
  };
}
