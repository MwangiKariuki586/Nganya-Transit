import { beforeEach, describe, expect, it, vi } from "vitest";

const getCorridors = vi.fn();
const countNganyas = vi.fn();
const getNganyasByIds = vi.fn();
const searchNganyas = vi.fn();
const searchHomepageNganyas = vi.fn();
const getLiveNow = vi.fn();
const getMyFollows = vi.fn();
const getStableClientSession = vi.fn();
const getCorridorSightings = vi.fn();
const getHomepageRecentSightings = vi.fn();
const getMySightings = vi.fn();

vi.mock("@/lib/queries/discover", () => ({
  countNganyas,
  getNganyasByIds,
  getCorridors,
  searchHomepageNganyas,
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
  getHomepageRecentSightings,
  getMySightings,
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
    countNganyas.mockReset();
    getNganyasByIds.mockReset();
    searchNganyas.mockReset();
    searchHomepageNganyas.mockReset();
    getLiveNow.mockReset();
    getMyFollows.mockReset();
    getStableClientSession.mockReset();
    getCorridorSightings.mockReset();
    getHomepageRecentSightings.mockReset();
    getMySightings.mockReset();
  });

  it("loads discover catalogue data with a paged initial catalogue", async () => {
    const sharedCorridors = [{ id: "1", name: "CBD" }];
    const sharedLiveNganyas = [{ id: "live-1", corridor_id: "1", nganya_id: "n-1" }];

    searchNganyas.mockResolvedValue([
      { id: "n-1", corridor_id: "1", tags: ["NEW_BUILD"], follower_count: 10 },
    ]);
    countNganyas.mockResolvedValue(1);
    getNganyasByIds.mockResolvedValue([
      { id: "n-1", corridor_id: "1", nganya_media: [{ media_url: "gallery.jpg" }] },
    ]);
    getMyFollows.mockResolvedValue([{ nganya_id: "n-1" }]);
    getStableClientSession.mockResolvedValue({ user: { id: "user-1" } });

    const { loadDiscoverRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const shared = { corridors: sharedCorridors, liveNganyas: sharedLiveNganyas };
    const result = await loadDiscoverRouteData(shared);

    expect(searchNganyas).toHaveBeenCalledWith("", undefined, 48);
    expect(result.corridors).toHaveLength(1);
    expect(result.corridors[0].name).toBe("CBD");
    expect(result.corridors[0].nganyaCount).toBe(1);
    expect(result.corridors[0].liveCount).toBe(1);
    expect(result.initialNganyas).toHaveLength(1);
    expect(result.featuredLive).toHaveLength(1);
    expect(result.featuredLive[0]?.nganya_media?.[0]?.media_url).toBe("gallery.jpg");
    expect(result.liveNganyas).toStrictEqual(sharedLiveNganyas);
    expect(result.followedIds.has("n-1")).toBe(true);
    expect(result.totalCount).toBe(1);
    expect(result.initialHasMore).toBe(false);
    expect(result.initialNextOffset).toBe(1);
  });

  it("uses shared corridors when loading home route data", async () => {
    const sharedCorridors = [
      { id: "corr-1", name: "CBD" },
      { id: "corr-2", name: "Rongai" },
    ];
    const sharedLiveNganyas: any[] = [];

    searchHomepageNganyas.mockResolvedValue([]);
    getHomepageRecentSightings.mockResolvedValue([]);
    getMyFollows.mockResolvedValue([]);
    getStableClientSession.mockResolvedValue(null);

    const { loadFanHomeRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const shared = { corridors: sharedCorridors, liveNganyas: sharedLiveNganyas };

    const result = await loadFanHomeRouteData({}, shared);

    expect(result.activeCorridor).toBeNull();
    expect(result.corridors).toBe(sharedCorridors);
    expect(result.liveNganyas).toStrictEqual(sharedLiveNganyas);
    expect(searchHomepageNganyas).toHaveBeenCalledWith("", undefined);
    expect(getHomepageRecentSightings).toHaveBeenCalledWith(80, {
      includeConfidence: false,
    });
    expect(getCorridorSightings).not.toHaveBeenCalled();
  });

  it("enriches home live nganyas with full image relations from homepage nganyas", async () => {
    searchHomepageNganyas.mockResolvedValue([
      {
        id: "n-1",
        name: "Alcapone",
        corridor_id: "corr-1",
        nganya_media: [
          { media_url: "https://example.com/gallery.jpg", media_type: "image" },
        ],
      },
    ]);
    getHomepageRecentSightings.mockResolvedValue([]);
    getMyFollows.mockResolvedValue([]);
    getStableClientSession.mockResolvedValue(null);

    const { loadFanHomeRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const result = await loadFanHomeRouteData(
      {},
      {
        corridors: [{ id: "corr-1", name: "Kasarani" }],
        liveNganyas: [
          {
            id: "live-1",
            nganya_id: "n-1",
            nganya_name: "Alcapone",
            corridor_id: "corr-1",
            profile_photo_url: "https://example.com/live.jpg",
          },
        ],
      },
    );

    expect(result.liveNganyas[0]?.nganya_media?.[0]?.media_url).toBe(
      "https://example.com/gallery.jpg",
    );
    expect(result.liveNganyas[0]?.profile_photo_url).toBe(
      "https://example.com/live.jpg",
    );
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

  it("skips spot route catalogue loading for anonymous users", async () => {
    getStableClientSession.mockResolvedValue(null);

    const { loadSpotRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const result = await loadSpotRouteData({
      corridors: [{ id: "c1", name: "CBD" }],
      liveNganyas: [{ id: "live-1" }],
    });

    expect(searchNganyas).not.toHaveBeenCalled();
    expect(getMySightings).not.toHaveBeenCalled();
    expect(getHomepageRecentSightings).not.toHaveBeenCalled();
    expect(result).toEqual({
      isAuthenticated: false,
      corridors: [],
      nganyas: [],
      liveNganyas: [],
      recentSightings: [],
      mySightings: [],
      followedIds: new Set(),
    });
  });

  it("uses one bounded recent-sightings query for authenticated spot route data", async () => {
    getStableClientSession.mockResolvedValue({ user: { id: "user-1" } });
    searchNganyas.mockResolvedValue([{ id: "n-1" }]);
    getMyFollows.mockResolvedValue([{ nganya_id: "n-1" }]);
    getMySightings.mockResolvedValue([{ id: "mine-1" }]);
    getHomepageRecentSightings.mockResolvedValue([{ id: "recent-1" }]);

    const { loadSpotRouteData } = await import(
      "@/modules/fan/services/route-data"
    );

    const result = await loadSpotRouteData({
      corridors: [{ id: "c1", name: "CBD" }],
      liveNganyas: [{ id: "live-1" }],
    });

    expect(getHomepageRecentSightings).toHaveBeenCalledWith(80, {
      includeConfidence: false,
    });
    expect(getCorridorSightings).not.toHaveBeenCalled();
    expect(result.recentSightings).toEqual([{ id: "recent-1" }]);
    expect(result.followedIds.has("n-1")).toBe(true);
  });
});
