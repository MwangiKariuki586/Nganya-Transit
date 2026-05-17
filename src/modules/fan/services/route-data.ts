import {
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
  /** Full catalogue (up to 100) for client-side filtering. */
  allNganyas: any[];
  /** All live nganyas, required for isLive card state. */
  liveNganyas: any[];
  followedIds: Set<string>;
  totalCount: number;
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

  const recentSightings = activeCorridor
    ? await getCorridorSightings(activeCorridor)
    : await getHomepageRecentSightings(80, { includeConfidence: false });

  return {
    search,
    activeCorridor,
    activeVibe,
    corridors,
    nganyas,
    liveNganyas,
    recentSightings,
    followedIds: toFollowedIds(follows),
  };
}

export async function loadDiscoverRouteData(
  shared: FanSharedData,
): Promise<DiscoverRouteData> {
  const { corridors, liveNganyas } = shared;

  const [allNganyas, follows] = await Promise.all([
    searchNganyas(""),
    getOptionalFollows(),
  ]);

  const corridorSummaries: DiscoverCorridorSummary[] = corridors.map(
    (c: any) => ({
      id: c.id,
      name: c.name,
      nganyaCount: allNganyas.filter((n: any) => n.corridor_id === c.id).length,
      liveCount: liveNganyas.filter((n: any) => n.corridor_id === c.id).length,
    }),
  );

  // Curated strip: first 6 live nganyas, enriched with image data from allNganyas.
  // liveNganyas rows come from v_live_now which has no nganya_media / crew_nganyas joins,
  // so we merge each live row with its matching allNganyas entry to get the image fields.
  const allNganyasById = new Map(allNganyas.map((n: any) => [n.id, n]));
  const featuredLive = liveNganyas.slice(0, 6).map((live: any) => {
    const nganyaId = live.nganya_id || live.id;
    const full = allNganyasById.get(nganyaId);
    if (!full) return live;
    // Spread full nganya fields first (has image relations), then overlay live session
    // fields (nganya_id, status, last_ping_at, etc.) so isLive detection still works.
    return { ...full, ...live, nganya_media: full.nganya_media, crew_nganyas: full.crew_nganyas };
  });

  return {
    corridors: corridorSummaries,
    featuredLive,
    allNganyas,
    liveNganyas,
    followedIds: toFollowedIds(follows),
    totalCount: allNganyas.length,
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

  // Fetch generously so client-side filters (vibe, verifiedOnly) don't deplete the page.
  let nganyas = await searchNganyas(
    search,
    input.corridorId || undefined,
    200,
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
  const { corridors, liveNganyas } = shared;

  const session = await getStableClientSession();
  const [nganyas, follows, mySightings] = await Promise.all([
    searchNganyas(""),
    getOptionalFollows(),
    session?.user?.id ? getMySightings() : Promise.resolve([]),
  ]);

  const recentSightings = (
    await Promise.all(
      corridors.map((corridor: any) => getCorridorSightings(corridor.id)),
    )
  ).flat();

  return {
    isAuthenticated: Boolean(session?.user?.id),
    corridors,
    nganyas,
    liveNganyas,
    recentSightings,
    mySightings,
    followedIds: toFollowedIds(follows),
  };
}
