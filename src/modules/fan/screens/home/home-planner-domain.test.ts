import { describe, expect, it } from "vitest";
import {
  buildPlannerJourneyKey,
  buildPlannerRouteCacheKey,
  getPlannerRiskPrompt,
  shouldResetPlannerResults,
} from "./home-planner-domain";

describe("home planner domain helpers", () => {
  it("builds planner keys and detects route changes", () => {
    const first = buildPlannerJourneyKey({
      plannerCorridorId: "c1",
      plannerStageId: "s1",
      preference: "ANY",
    });
    const second = buildPlannerJourneyKey({
      plannerCorridorId: "c2",
      plannerStageId: "s1",
      preference: "ANY",
    });

    expect(first).toBe("c1:s1:ANY:");
    expect(shouldResetPlannerResults(first, second!)).toBe(true);
    expect(shouldResetPlannerResults(first, "c1:s1:SPECIFIC:n1")).toBe(false);
  });

  it("builds a stable planner route cache key", () => {
    expect(
      buildPlannerRouteCacheKey({
        rideId: "n1",
        stageId: "s1",
        nganyaPos: { lat: -1.123456, lng: 36.987654 },
        stagePos: { lat: -1.200001, lng: 36.900009 },
      }),
    ).toBe("n1:s1:36.98765,-1.12346:36.90001,-1.20000");
  });

  it("derives watched-ride prompts and honors dismissals", () => {
    const alternative = {
      nganya_id: "n2",
      nganya_name: "Backup",
      corridor_id: "c1",
      corridor_name: "Thika Road",
      eta_minutes: 7,
      confidence_level: "HIGH",
      source: "LIVE",
      signalType: "LIVE",
      freshnessSeconds: 30,
      catchability: {
        status: "CATCHABLE",
        label: "Catchable",
        subtext: "Fresh and nearby",
      },
    } as any;
    const watched = {
      ...alternative,
      nganya_id: "n1",
      nganya_name: "Watched",
      catchability: {
        status: "STALE_UNCERTAIN",
        label: "Stale",
        subtext: "Signal is stale",
      },
    } as any;

    const prompt = getPlannerRiskPrompt({
      watchedRideId: "n1",
      watchedRide: watched,
      backupRides: [alternative],
      dismissedRiskKey: null,
    });
    expect(prompt?.reason).toBe("stale");
    expect(prompt?.alternative?.nganya_id).toBe("n2");

    expect(
      getPlannerRiskPrompt({
        watchedRideId: "n1",
        watchedRide: watched,
        backupRides: [alternative],
        dismissedRiskKey: prompt?.key || null,
      }),
    ).toBeNull();
  });
});
