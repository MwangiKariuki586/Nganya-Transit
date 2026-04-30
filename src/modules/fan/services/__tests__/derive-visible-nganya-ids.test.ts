import { describe, expect, it } from "vitest";

import { deriveVisibleNganyaIds } from "@/modules/fan/services/derive-visible-nganya-ids";
import type { PlannerStorageContext } from "@/modules/fan/services/planner-storage";

function makePlannerContext(
  overrides: Partial<PlannerStorageContext>,
): PlannerStorageContext {
  return {
    toPlace: null,
    fromStage: null,
    preferredNganya: null,
    preference: "ANY",
    ...overrides,
  };
}

describe("deriveVisibleNganyaIds", () => {
  it("returns null for ANY", () => {
    const ctx = makePlannerContext({ preference: "ANY" });
    expect(deriveVisibleNganyaIds(ctx, [])).toBeNull();
  });

  it("returns [preferredId] for SPECIFIC", () => {
    const ctx = makePlannerContext({
      toPlace: { id: "c1", name: "Route", corridor_id: "c1" },
      fromStage: { id: "s1", name: "Stage" },
      preference: "SPECIFIC",
      preferredNganya: { id: "ng1", name: "Nganya 1" },
    });
    expect(deriveVisibleNganyaIds(ctx, [])).toEqual(["ng1"]);
  });

  it("returns null for SPECIFIC when no preferred nganya", () => {
    const ctx = makePlannerContext({
      toPlace: { id: "c1", name: "Route", corridor_id: "c1" },
      fromStage: { id: "s1", name: "Stage" },
      preference: "SPECIFIC",
    });
    expect(deriveVisibleNganyaIds(ctx, [])).toBeNull();
  });

  it("returns result ids for NEWEST (null when empty)", () => {
    const ctx = makePlannerContext({
      toPlace: { id: "c1", name: "Route", corridor_id: "c1" },
      fromStage: { id: "s1", name: "Stage" },
      preference: "NEWEST",
    });
    expect(deriveVisibleNganyaIds(ctx, [])).toBeNull();
    expect(
      deriveVisibleNganyaIds(ctx, [
        { nganya_id: "a" } as any,
        { nganya_id: "b" } as any,
      ]),
    ).toEqual(["a", "b"]);
  });
});
