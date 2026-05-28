import { describe, expect, it } from "vitest";
import {
  addFollowedId,
  applyFollowOverride,
  clearMutatingId,
  restoreFollowOverride,
  toggleFollowedIdSet,
} from "@/modules/fan/services/follow-optimistic";

describe("follow optimistic helpers", () => {
  it("toggles followed ids without mutating the input set", () => {
    const initial = new Set(["nganya-1"]);
    const removed = toggleFollowedIdSet(initial, "nganya-1", true);
    const added = toggleFollowedIdSet(initial, "nganya-2", false);

    expect(Array.from(initial)).toEqual(["nganya-1"]);
    expect(Array.from(removed)).toEqual([]);
    expect(Array.from(added).sort()).toEqual(["nganya-1", "nganya-2"]);
  });

  it("adds a followed id without mutating the input set", () => {
    const initial = new Set<string>();
    const next = addFollowedId(initial, "nganya-9");

    expect(Array.from(initial)).toEqual([]);
    expect(Array.from(next)).toEqual(["nganya-9"]);
  });

  it("applies and restores follow overrides predictably", () => {
    const initial = {
      "nganya-1": { notifyLive: false },
    };

    const patched = applyFollowOverride(initial, "nganya-1", {
      isFollowing: true,
    });
    expect(patched["nganya-1"]).toEqual({
      notifyLive: false,
      isFollowing: true,
    });

    const restored = restoreFollowOverride(patched, "nganya-1", initial["nganya-1"]);
    expect(restored).toEqual(initial);

    const removed = restoreFollowOverride(
      applyFollowOverride(initial, "nganya-2", { isFollowing: false }),
      "nganya-2",
    );
    expect(removed).toEqual(initial);
  });

  it("clears one mutating id without touching the rest", () => {
    expect(
      clearMutatingId(
        { "nganya-1": true, "nganya-2": true },
        "nganya-1",
      ),
    ).toEqual({ "nganya-2": true });
  });
});
