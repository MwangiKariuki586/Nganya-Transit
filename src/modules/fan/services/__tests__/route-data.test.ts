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

  it("loads discover data from route inputs instead of shared store state", async () => {
    getCorridors.mockResolvedValue([{ id: "1", name: "CBD" }]);
    searchNganyas.mockResolvedValue([{ id: "n-1" }]);
    getLiveNow.mockResolvedValue([{ id: "live-1" }]);
    getMyFollows.mockResolvedValue([{ nganya_id: "n-1" }]);
    getStableClientSession.mockResolvedValue({ user: { id: "user-1" } });

    const { loadDiscoverRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const result = await loadDiscoverRouteData({
      search: "mat",
      corridorId: "1",
      vibe: "BASS_HEAVY",
    });

    expect(searchNganyas).toHaveBeenCalledWith("mat", "1");
    expect(getLiveNow).toHaveBeenCalledWith("1");
    expect(result.search).toBe("mat");
    expect(result.activeCorridor).toBe("1");
    expect(result.activeVibe).toBe("BASS_HEAVY");
    expect(result.followedIds.has("n-1")).toBe(true);
  });

  it("uses the effective home corridor when loading home route data", async () => {
    getCorridors.mockResolvedValue([
      { id: "corr-1", name: "CBD" },
      { id: "corr-2", name: "Rongai" },
    ]);
    searchNganyas.mockResolvedValue([]);
    getLiveNow.mockResolvedValue([]);
    getCorridorSightings.mockResolvedValue([]);
    getMyFollows.mockResolvedValue([]);
    getStableClientSession.mockResolvedValue(null);

    const { loadFanHomeRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const result = await loadFanHomeRouteData({});

    expect(result.activeCorridor).toBe("corr-1");
    expect(searchNganyas).toHaveBeenCalledWith("", "corr-1");
    expect(getLiveNow).toHaveBeenCalledWith("corr-1");
    expect(getCorridorSightings).toHaveBeenCalledWith("corr-1");
  });
});
