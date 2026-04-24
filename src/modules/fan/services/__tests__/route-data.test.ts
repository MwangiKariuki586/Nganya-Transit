import { beforeEach, describe, expect, it, vi } from "vitest";

const getCorridors = vi.fn();
const searchNganyas = vi.fn();
const getLiveNow = vi.fn();
const getMyFollows = vi.fn();
const getStableClientSession = vi.fn();
const getCorridorSightings = vi.fn();

vi.mock("@/lib/queries/discover", () => ({
  getCorridors,
  searchNganyas,
}));

vi.mock("@/lib/queries/live", () => ({
  getLiveNow,
}));

vi.mock("@/lib/queries/follows", () => ({
  getMyFollows,
}));

vi.mock("@/shared/auth/client-session", () => ({
  getStableClientSession,
}));

vi.mock("@/lib/queries/sightings", () => ({
  getCorridorSightings,
  getMySightings: vi.fn(),
  postSighting: vi.fn(),
}));

vi.mock("@/lib/queries/profile", () => ({
  getCurrentAuthUser: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
}));

describe("fan route data", () => {
  beforeEach(() => {
    getCorridors.mockReset();
    searchNganyas.mockReset();
    getLiveNow.mockReset();
    getMyFollows.mockReset();
    getStableClientSession.mockReset();
    getCorridorSightings.mockReset();
  });

  it("loads discover data from route inputs using shared context data", async () => {
    const sharedCorridors = [{ id: "1", name: "CBD" }];
    const sharedLiveNganyas = [{ id: "live-1" }];

    searchNganyas.mockResolvedValue([{ id: "n-1" }]);
    getMyFollows.mockResolvedValue([{ nganya_id: "n-1" }]);
    getStableClientSession.mockResolvedValue({ user: { id: "user-1" } });

    const { loadDiscoverRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const shared = { corridors: sharedCorridors, liveNganyas: sharedLiveNganyas };

    const result = await loadDiscoverRouteData(
      { search: "mat", corridorId: "1", vibe: "BASS_HEAVY" },
      shared,
    );

    expect(searchNganyas).toHaveBeenCalledWith("mat", "1");
    expect(result.search).toBe("mat");
    expect(result.activeCorridor).toBe("1");
    expect(result.activeVibe).toBe("BASS_HEAVY");
    expect(result.followedIds.has("n-1")).toBe(true);
    expect(result.corridors).toBe(sharedCorridors);
    expect(result.liveNganyas).toBe(sharedLiveNganyas);
  });

  it("uses shared corridors when loading home route data", async () => {
    const sharedCorridors = [
      { id: "corr-1", name: "CBD" },
      { id: "corr-2", name: "Rongai" },
    ];
    const sharedLiveNganyas: any[] = [];

    searchNganyas.mockResolvedValue([]);
    getCorridorSightings.mockResolvedValue([]);
    getMyFollows.mockResolvedValue([]);
    getStableClientSession.mockResolvedValue(null);

    const { loadFanHomeRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const shared = { corridors: sharedCorridors, liveNganyas: sharedLiveNganyas };

    const result = await loadFanHomeRouteData({}, shared);

    expect(result.activeCorridor).toBeNull();
    expect(result.corridors).toBe(sharedCorridors);
    expect(result.liveNganyas).toBe(sharedLiveNganyas);
  });

  it("loads shared data with corridors and live nganyas", async () => {
    getCorridors.mockResolvedValue([{ id: "c1" }]);
    getLiveNow.mockResolvedValue([{ id: "l1" }]);

    const { loadFanSharedData } = await import(
      "@/modules/fan/services/route-data"
    );

    const shared = await loadFanSharedData();

    expect(getCorridors).toHaveBeenCalledOnce();
    expect(getLiveNow).toHaveBeenCalledOnce();
    expect(shared.corridors).toEqual([{ id: "c1" }]);
    expect(shared.liveNganyas).toEqual([{ id: "l1" }]);
  });
});
