import {
  countNganyas,
  getNganyasByIds,
  getCorridors,
  searchHomepageNganyas,
  searchNganyas,
} from "@/lib/queries/discover";
import { getMyFollows } from "@/lib/queries/follows";
import { getLiveNow } from "@/lib/queries/live";
import {
  getCurrentAuthUser,
  getCurrentUserProfile,
} from "@/lib/queries/profile";
import {
  getCorridorSightings,
  getHomepageRecentSightings,
  getMySightings,
} from "@/lib/queries/sightings";
import { getStableClientSession } from "@/shared/auth/client-session";
import { enrichNganyaImageFields } from "@/modules/fan/lib/nganya-card";

// ── Shared data loaded once at the fan layout level ─────────────────

export interface FanSharedData {
  corridors: any[];
  liveNganyas: any[];
}

export async function loadFanSharedData(): Promise<FanSharedData> {
  const [corridors, liveNganyas] = await Promise.all([
    getCorridors(),
    getLiveNow(),
  ]);
  return { corridors, liveNganyas };
}

// ── Per-route data types ────────────────────────────────────────────

export interface FanHomeRouteData {
  search: string;
  activeCorridor: string | null;
  activeVibe: string | null;
  corridors: any[];
  nganyas: any[];
  liveNganyas: any[];
  recentSightings: any[];
  followedIds: Set<string>;
}

export interface DiscoverRouteData {
  corridors: DiscoverCorridorSummary[];
  /** Up to 6 live nganyas for the curated strip — sourced from shared liveNganyas. */
  featuredLive: any[];
  /** First server-loaded page for the catalogue. */
  initialNganyas: any[];
  /** All live nganyas, required for isLive card state. */
  liveNganyas: any[];
  followedIds: Set<string>;
  totalCount: number;
  initialHasMore: boolean;
  initialNextOffset: number;
}

export interface DiscoverCorridorSummary {
  id: string;
  name: string;
  nganyaCount: number;
  liveCount: number;
}

export interface DiscoverCataloguePageData {
  nganyas: any[];
  hasMore: boolean;
  nextOffset: number;
  totalCount: number;
}

export interface FollowingRouteData {
  isAuthenticated: boolean;
  followedNganyas: any[];
  nganyas: any[];
  liveNganyas: any[];
  recentSightings: any[];
}

export interface ProfileRouteData {
  authUser: any | null;
  profile: any | null;
  followedNganyas: any[];
  liveNganyas: any[];
  userSightings: any[];
}

export interface SpotRouteData {
  isAuthenticated: boolean;
  corridors: any[];
  nganyas: any[];
  liveNganyas: any[];
  recentSightings: any[];
  mySightings: any[];
  followedIds: Set<string>;
}

function toFollowedIds(follows: any[]) {
  return new Set(follows.map((follow: any) => follow.nganya_id));
}

async function getOptionalFollows() {
  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return [];
  }

  return getMyFollows();
}

// ── Per-route loaders (receive shared data from parent context) ─────

export async function loadFanHomeRouteData(
  input: {
    search?: string;
    corridorId?: string | null;
    vibe?: string | null;
  },
  shared: FanSharedData,
): Promise<FanHomeRouteData> {
  const { corridors, liveNganyas } = shared;
  const search = input.search?.trim() || "";
  const activeCorridor = input.corridorId || null;
  const activeVibe = input.vibe || null;

  const [nganyas, follows] = await Promise.all([
    searchHomepageNganyas(search, activeCorridor || undefined),
    getOptionalFollows(),
  ]);

  const nganyasById = new Map(
    nganyas.map((nganya: any) => [nganya.id || nganya.nganya_id, nganya]),
  );
  const enrichedLiveNganyas = liveNganyas.map((live: any) =>
    enrichNganyaImageFields(live, nganyasById),
  );

  const recentSightings = activeCorridor
    ? await getCorridorSightings(activeCorridor)
    : await getHomepageRecentSightings(80, { includeConfidence: false });

  return {
    search,
    activeCorridor,
    activeVibe,
    corridors,
    nganyas,
    liveNganyas: enrichedLiveNganyas,
    recentSightings,
    followedIds: toFollowedIds(follows),
  };
}

export async function loadDiscoverRouteData(
  shared: FanSharedData,
): Promise<DiscoverRouteData> {
  const { corridors, liveNganyas } = shared;

  const featuredLiveBase = liveNganyas.slice(0, 6);
  const featuredLiveIds = featuredLiveBase
    .map((live: any) => live.nganya_id || live.id)
    .filter(Boolean);

  const [initialCatalogue, follows, totalCount, featuredNganyas, corridorCounts] =
    await Promise.all([
      loadDiscoverCataloguePage({ limit: 12 }),
      getOptionalFollows(),
      countNganyas(),
      getNganyasByIds(featuredLiveIds),
      Promise.all(
        corridors.map(async (corridor: any) => ({
          id: corridor.id,
          count: await countNganyas(corridor.id),
        })),
      ),
    ]);

  const corridorCountById = new Map(
    corridorCounts.map((entry) => [entry.id, entry.count]),
  );
  const corridorSummaries: DiscoverCorridorSummary[] = corridors.map(
    (c: any) => ({
      id: c.id,
      name: c.name,
      nganyaCount: corridorCountById.get(c.id) || 0,
      liveCount: liveNganyas.filter((n: any) => n.corridor_id === c.id).length,
    }),
  );

  const featuredNganyasById = new Map(
    featuredNganyas.map((n: any) => [n.id, n]),
  );
  const featuredLive = featuredLiveBase.map((live: any) =>
    enrichNganyaImageFields(live, featuredNganyasById),
  );

  return {
    corridors: corridorSummaries,
    featuredLive,
    initialNganyas: initialCatalogue.nganyas,
    liveNganyas,
    followedIds: toFollowedIds(follows),
    totalCount,
    initialHasMore: initialCatalogue.hasMore,
    initialNextOffset: initialCatalogue.nextOffset,
  };
}

export async function loadDiscoverCataloguePage(input: {
  search?: string;
  corridorId?: string | null;
  vibe?: string | null;
  sort?: "trending" | "newest" | "popular" | "active";
  verifiedOnly?: boolean;
  offset?: number;
  limit?: number;
}): Promise<DiscoverCataloguePageData> {
  const search = input.search?.trim() || "";
  const limit = input.limit || 12;
  const offset = input.offset || 0;
  const fetchLimit = Math.min(Math.max(offset + limit + 24, 48), 240);

  // This still uses the existing client query surface, but only fetches a bounded
  // working set for the current page/filter state instead of the full catalogue.
  let nganyas = await searchNganyas(
    search,
    input.corridorId || undefined,
    fetchLimit,
  );

  if (input.vibe) {
    nganyas = nganyas.filter((n: any) => n.tags?.includes(input.vibe));
  }
  if (input.verifiedOnly) {
    nganyas = nganyas.filter((n: any) => Boolean(n.is_verified));
  }

  const sort = input.sort ?? "trending";
  if (sort === "trending") {
    nganyas.sort(
      (a: any, b: any) =>
        ((b.follower_count || 0) + (b.sighting_count_today || 0)) -
        ((a.follower_count || 0) + (a.sighting_count_today || 0)),
    );
  } else if (sort === "popular") {
    nganyas.sort(
      (a: any, b: any) => (b.follower_count || 0) - (a.follower_count || 0),
    );
  } else if (sort === "newest") {
    nganyas.sort(
      (a: any, b: any) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );
  } else if (sort === "active") {
    nganyas.sort(
      (a: any, b: any) =>
        (b.sighting_count_today || 0) - (a.sighting_count_today || 0),
    );
  }

  const page = nganyas.slice(offset, offset + limit);
  const hasMore = nganyas.length > offset + limit;

  return {
    nganyas: page,
    hasMore,
    nextOffset: offset + page.length,
    totalCount: nganyas.length,
  };
}

export async function loadFollowingRouteData(
  shared: FanSharedData,
): Promise<FollowingRouteData> {
  const { liveNganyas } = shared;

  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return {
      isAuthenticated: false,
      followedNganyas: [],
      nganyas: [],
      liveNganyas,
      recentSightings: [],
    };
  }

  const [followedNganyas, nganyas] = await Promise.all([
    getMyFollows(),
    searchNganyas(""),
  ]);

  const corridorIds = Array.from(
    new Set(
      followedNganyas
        .map((follow: any) => follow.nganyas?.corridor_id)
        .filter(Boolean),
    ),
  );

  const recentSightings = corridorIds.length
    ? (
        await Promise.all(
          corridorIds.map((corridorId) => getCorridorSightings(corridorId)),
        )
      ).flat()
    : [];

  return {
    isAuthenticated: true,
    followedNganyas,
    nganyas,
    liveNganyas,
    recentSightings,
  };
}

export async function loadProfileRouteData(
  shared: FanSharedData,
): Promise<ProfileRouteData> {
  const { liveNganyas } = shared;

  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return {
      authUser: null,
      profile: null,
      followedNganyas: [],
      liveNganyas,
      userSightings: [],
    };
  }

  const [authUser, profile, followedNganyas, userSightings] =
    await Promise.all([
      getCurrentAuthUser(),
      getCurrentUserProfile(),
      getMyFollows(),
      getMySightings(),
    ]);

  return {
    authUser,
    profile,
    followedNganyas,
    liveNganyas,
    userSightings,
  };
}

export async function loadSpotRouteData(
  shared: FanSharedData,
): Promise<SpotRouteData> {
  const { liveNganyas } = shared;

  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return {
      isAuthenticated: false,
      corridors: [],
      nganyas: [],
      liveNganyas: [],
      recentSightings: [],
      mySightings: [],
      followedIds: new Set<string>(),
    };
  }

  const [nganyas, follows, mySightings] = await Promise.all([
    searchNganyas(""),
    getOptionalFollows(),
    getMySightings(),
  ]);
  const recentSightings = await getHomepageRecentSightings(80, {
    includeConfidence: false,
  });

  return {
    isAuthenticated: true,
    corridors: shared.corridors,
    nganyas,
    liveNganyas,
    recentSightings,
    mySightings,
    followedIds: toFollowedIds(follows),
  };
}
