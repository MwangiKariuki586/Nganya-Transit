import { beforeEach, describe, expect, it } from "vitest";
import {
  buildHomePlannerSearch,
  buildPlannerSeedToastMessage,
  buildPlannerStageToastMessage,
  persistPlannerHandoff,
  shouldTrackPlannerHandoffTarget,
} from "@/modules/fan/services/planner-handoff";
import type { PlannerStorageContext } from "@/modules/fan/services/planner-storage";

const basePlannerContext: PlannerStorageContext = {
  toPlace: null,
  fromStage: null,
  preferredNganya: null,
  preference: "ANY",
};

describe("planner handoff helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("recognizes when a live item can be tracked from the planner context", () => {
    const plannerContext: PlannerStorageContext = {
      ...basePlannerContext,
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
    };

    expect(
      shouldTrackPlannerHandoffTarget(plannerContext, {
        corridorId: "corridor-1",
        isLive: true,
      }),
    ).toBe(true);
    expect(
      shouldTrackPlannerHandoffTarget(plannerContext, {
        corridorId: "corridor-2",
        isLive: true,
      }),
    ).toBe(false);
    expect(
      shouldTrackPlannerHandoffTarget(plannerContext, {
        corridorId: "corridor-1",
        isLive: false,
      }),
    ).toBe(false);
  });

  it("builds stable planner seed and stage toast copy", () => {
    expect(
      buildPlannerSeedToastMessage({
        corridorName: "Thika Road",
        name: "Matwana Express",
      }),
    ).toBe(
      "Route set to Thika Road. Pick your pickup stage to plan with Matwana Express.",
    );
    expect(
      buildPlannerStageToastMessage({
        corridorName: "Thika Road",
        stageName: "Muthaiga",
        name: "Matwana Express",
      }),
    ).toBe(
      "Planner set to Muthaiga on Thika Road for Matwana Express.",
    );
  });

  it("persists planner handoff data and returns home search state", () => {
    const plannerContext: PlannerStorageContext = {
      ...basePlannerContext,
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    };

    const search = persistPlannerHandoff(
      plannerContext,
      {
        id: "nganya-1",
        name: "Matwana Express",
        corridorId: "corridor-2",
        corridorName: "Ngong Road",
      },
      { clearStageOnRouteChange: true },
    );

    expect(search).toEqual({ corridor: "corridor-2" });
    expect(window.localStorage.getItem("whereto_toPlace")).toContain("corridor-2");
    expect(window.localStorage.getItem("whereto_preference")).toBe("SPECIFIC");
    expect(window.localStorage.getItem("whereto_fromStage")).toBeNull();
  });

  it("builds home corridor search from the current context when there is no target", () => {
    expect(
      buildHomePlannerSearch({
        ...basePlannerContext,
        toPlace: { id: "corridor-9", corridor_id: "corridor-9", name: "Outer Ring" },
      }),
    ).toEqual({ corridor: "corridor-9" });
  });
});
