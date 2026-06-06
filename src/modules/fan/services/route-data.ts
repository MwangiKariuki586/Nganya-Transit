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
import type {
  FanCorridorRecord,
  FanFollowRecord,
  FanLiveNganyaRecord,
  FanNganyaRecord,
  FanRecentSightingRecord,
} from "@/modules/fan/lib/fan-data";

type AuthUserRecord = Awaited<ReturnType<typeof getCurrentAuthUser>>;
type ProfileRecord = Awaited<ReturnType<typeof getCurrentUserProfile>>;

// ── Shared data loaded once at the fan layout level ─────────────────

export interface FanSharedData {
  corridors: FanCorridorRecord[];
  liveNganyas: FanLiveNganyaRecord[];
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
  isAuthenticated: boolean;
  search: string;
  activeCorridor: string | null;
  activeVibe: string | null;
  corridors: FanCorridorRecord[];
  nganyas: FanNganyaRecord[];
  liveNganyas: FanLiveNganyaRecord[];
  recentSightings: FanRecentSightingRecord[];
  followedIds: Set<string>;
}

export interface DiscoverRouteData {
  isAuthenticated: boolean;
  corridors: DiscoverCorridorSummary[];
  /** Up to 6 live nganyas for the curated strip — sourced from shared liveNganyas. */
  featuredLive: FanLiveNganyaRecord[];
  /** First server-loaded page for the catalogue. */
  initialNganyas: FanNganyaRecord[];
  /** All live nganyas, required for isLive card state. */
  liveNganyas: FanLiveNganyaRecord[];
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
  nganyas: FanNganyaRecord[];
  hasMore: boolean;
  nextOffset: number;
  totalCount: number;
}

export interface FollowingRouteData {
  isAuthenticated: boolean;
  followedNganyas: FanFollowRecord[];
  nganyas: FanNganyaRecord[];
  liveNganyas: FanLiveNganyaRecord[];
  recentSightings: FanRecentSightingRecord[];
}

export interface ProfileRouteData {
  authUser: AuthUserRecord | null;
  profile: ProfileRecord | null;
  followedNganyas: FanFollowRecord[];
  liveNganyas: FanLiveNganyaRecord[];
  userSightings: FanRecentSightingRecord[];
}

export interface SpotRouteData {
  isAuthenticated: boolean;
  corridors: FanCorridorRecord[];
  nganyas: FanNganyaRecord[];
  liveNganyas: FanLiveNganyaRecord[];
  recentSightings: FanRecentSightingRecord[];
  mySightings: FanRecentSightingRecord[];
  followedIds: Set<string>;
}

function toFollowedIds(follows: FanFollowRecord[]) {
  return new Set(follows.map((follow) => follow.nganya_id));
}

async function getOptionalFollows(): Promise<FanFollowRecord[]> {
  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return [];
  }

  return getMyFollows();
}

async function getOptionalFollowState(): Promise<{
  isAuthenticated: boolean;
  follows: FanFollowRecord[];
}> {
  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return { isAuthenticated: false, follows: [] };
  }

  return {
    isAuthenticated: true,
    follows: await getMyFollows(),
  };
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

  const [nganyas, followState] = (await Promise.all([
    searchHomepageNganyas(search, activeCorridor || undefined),
    getOptionalFollowState(),
  ])) as [
    FanNganyaRecord[],
    { isAuthenticated: boolean; follows: FanFollowRecord[] },
  ];

  const nganyasById = new Map(
    nganyas
      .map((nganya) => [nganya.id || nganya.nganya_id, nganya] as const)
      .filter((entry): entry is [string, FanNganyaRecord] => Boolean(entry[0])),
  );
  const enrichedLiveNganyas = liveNganyas.map((live) =>
    enrichNganyaImageFields(live, nganyasById),
  ) as FanLiveNganyaRecord[];

  const recentSightings = activeCorridor
    ? await getCorridorSightings(activeCorridor)
    : await getHomepageRecentSightings(80, { includeConfidence: false });

  return {
    isAuthenticated: followState.isAuthenticated,
    search,
    activeCorridor,
    activeVibe,
    corridors,
    nganyas,
    liveNganyas: enrichedLiveNganyas,
    recentSightings,
    followedIds: toFollowedIds(followState.follows),
  };
}

export async function loadDiscoverRouteData(
  shared: FanSharedData,
): Promise<DiscoverRouteData> {
  const { corridors, liveNganyas } = shared;

  const featuredLiveBase = liveNganyas.slice(0, 6);
  const featuredLiveIds = featuredLiveBase
    .map((live) => live.nganya_id || live.id)
    .filter((id): id is string => Boolean(id));

  const [
    initialCatalogue,
    followState,
    totalCount,
    featuredNganyas,
    corridorCounts,
  ] = (await Promise.all([
    loadDiscoverCataloguePage({ limit: 12 }),
    getOptionalFollowState(),
    countNganyas(),
    getNganyasByIds(featuredLiveIds),
    Promise.all(
      corridors.map(async (corridor) => ({
        id: corridor.id,
        count: await countNganyas(corridor.id),
      })),
    ),
  ])) as [
    DiscoverCataloguePageData,
    { isAuthenticated: boolean; follows: FanFollowRecord[] },
    number,
    FanNganyaRecord[],
    { id: string; count: number }[],
  ];

  const corridorCountById = new Map(
    corridorCounts.map((entry) => [entry.id, entry.count]),
  );
  const corridorSummaries: DiscoverCorridorSummary[] = corridors.map(
    (c) => ({
      id: c.id,
      name: c.name,
      nganyaCount: corridorCountById.get(c.id) || 0,
      liveCount: liveNganyas.filter((n) => n.corridor_id === c.id).length,
    }),
  );

  const featuredNganyasById = new Map(
    featuredNganyas
      .map((n) => [n.id || n.nganya_id, n] as const)
      .filter((entry): entry is [string, FanNganyaRecord] => Boolean(entry[0])),
  );
  const featuredLive = featuredLiveBase.map((live) =>
    enrichNganyaImageFields(live, featuredNganyasById),
  ) as FanLiveNganyaRecord[];

  return {
    isAuthenticated: followState.isAuthenticated,
    corridors: corridorSummaries,
    featuredLive,
    initialNganyas: initialCatalogue.nganyas,
    liveNganyas,
    followedIds: toFollowedIds(followState.follows),
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
  let nganyas = (await searchNganyas(
    search,
    input.corridorId || undefined,
    fetchLimit,
  )) as FanNganyaRecord[];

  if (input.vibe) {
    const vibe = input.vibe;
    nganyas = nganyas.filter((n) => n.tags?.includes(vibe));
  }
  if (input.verifiedOnly) {
    nganyas = nganyas.filter((n) => Boolean(n.is_verified));
  }

  const sort = input.sort ?? "trending";
  if (sort === "trending") {
    nganyas.sort(
      (a, b) =>
        ((b.follower_count || 0) + (b.sighting_count_today || 0)) -
        ((a.follower_count || 0) + (a.sighting_count_today || 0)),
    );
  } else if (sort === "popular") {
    nganyas.sort(
      (a, b) => (b.follower_count || 0) - (a.follower_count || 0),
    );
  } else if (sort === "newest") {
    nganyas.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );
  } else if (sort === "active") {
    nganyas.sort(
      (a, b) =>
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

  const [followedNganyas, nganyas] = (await Promise.all([
    getMyFollows(),
    searchNganyas(""),
  ])) as [FanFollowRecord[], FanNganyaRecord[]];

  const corridorIds = Array.from(
    new Set(
      followedNganyas
        .map((follow) => follow.nganyas?.corridor_id)
        .filter((id): id is string => Boolean(id)),
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
    (await Promise.all([
      getCurrentAuthUser(),
      getCurrentUserProfile(),
      getMyFollows(),
      getMySightings(),
    ])) as [any, any, FanFollowRecord[], FanRecentSightingRecord[]];

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

  const [nganyas, follows, mySightings] = (await Promise.all([
    searchNganyas(""),
    getOptionalFollows(),
    getMySightings(),
  ])) as [FanNganyaRecord[], FanFollowRecord[], FanRecentSightingRecord[]];
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
