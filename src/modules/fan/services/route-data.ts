import { getCorridors, searchNganyas } from "@/lib/queries/discover";
import { getMyFollows } from "@/lib/queries/follows";
import { getLiveNow } from "@/lib/queries/live";
import {
  getCurrentAuthUser,
  getCurrentUserProfile,
} from "@/lib/queries/profile";
import { getCorridorSightings, getMySightings } from "@/lib/queries/sightings";
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
  activeCorridor: string | null;
  corridors: any[];
  nganyas: any[];
  liveNganyas: any[];
  recentSightings: any[];
  followedIds: Set<string>;
}

export interface DiscoverRouteData {
  search: string;
  activeCorridor: string | null;
  activeVibe: string | null;
  corridors: any[];
  nganyas: any[];
  liveNganyas: any[];
  followedIds: Set<string>;
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
  input: { corridorId?: string | null },
  shared: FanSharedData,
): Promise<FanHomeRouteData> {
  const { corridors, liveNganyas } = shared;
  const activeCorridor = input.corridorId || null;

  const [nganyas, follows] = await Promise.all([
    searchNganyas("", activeCorridor || undefined),
    getOptionalFollows(),
  ]);

  const recentSightings = activeCorridor
    ? await getCorridorSightings(activeCorridor)
    : (
        await Promise.all(
          corridors.map((corridor: any) => getCorridorSightings(corridor.id)),
        )
      ).flat();

  return {
    activeCorridor,
    corridors,
    nganyas,
    liveNganyas,
    recentSightings,
    followedIds: toFollowedIds(follows),
  };
}

export async function loadDiscoverRouteData(
  input: { search?: string; corridorId?: string | null; vibe?: string | null },
  shared: FanSharedData,
): Promise<DiscoverRouteData> {
  const { corridors, liveNganyas } = shared;
  const search = input.search?.trim() || "";
  const activeCorridor = input.corridorId || null;
  const activeVibe = input.vibe || null;

  const [nganyas, follows] = await Promise.all([
    searchNganyas(search, activeCorridor || undefined),
    getOptionalFollows(),
  ]);

  return {
    search,
    activeCorridor,
    activeVibe,
    corridors,
    nganyas,
    liveNganyas,
    followedIds: toFollowedIds(follows),
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
