import { describe, expect, it, vi } from "vitest";
import {
  getPlannerAssistStatus,
  sortPlannerRideOptions,
} from "@/modules/fan/services/planner-assist";
import type { JourneyResult } from "@/lib/types/journey";

function makeRide(overrides: Partial<JourneyResult>): JourneyResult {
  return {
    nganya_id: "nganya-1",
    nganya_name: "Matwana Express",
    corridor_id: "corridor-1",
    corridor_name: "Thika Road",
    tags: null,
    eta_minutes: 6,
    confidence_level: "HIGH",
    source: "LIVE",
    last_seen_at: "2026-05-01T11:59:40.000Z",
    ...overrides,
  };
}

describe("planner-assist", () => {
  it("prioritizes catchable rides before risky and stale ones", () => {
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    const options = sortPlannerRideOptions([
      makeRide({
        nganya_id: "nganya-stale",
        nganya_name: "Stale Ride",
        source: "SIGHTING",
        last_seen_at: "2026-05-01T11:40:00.000Z",
      }),
      makeRide({
        nganya_id: "nganya-risky",
        nganya_name: "Risky Ride",
        eta_minutes: 2,
      }),
      makeRide({
        nganya_id: "nganya-best",
        nganya_name: "Best Ride",
        eta_minutes: 5,
      }),
    ]);

    expect(options.map((option) => option.nganya_id)).toEqual([
      "nganya-best",
      "nganya-risky",
      "nganya-stale",
    ]);
  });

  it("derives planner assist status from the watched ride when present", () => {
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    const options = sortPlannerRideOptions([
      makeRide({
        nganya_id: "nganya-risky",
        nganya_name: "Risky Ride",
        eta_minutes: 2,
      }),
      makeRide({
        nganya_id: "nganya-best",
        nganya_name: "Best Ride",
        eta_minutes: 5,
      }),
    ]);

    expect(getPlannerAssistStatus(options, null)).toBe("watchable");
    expect(getPlannerAssistStatus(options, "nganya-risky")).toBe("risky");
  });
});
