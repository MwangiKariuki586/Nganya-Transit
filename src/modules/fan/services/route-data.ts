import { getCorridors, searchNganyas } from "@/lib/queries/discover";
import { getMyFollows } from "@/lib/queries/follows";
import { getLiveNow } from "@/lib/queries/live";
import {
  getCurrentAuthUser,
  getCurrentUserProfile,
} from "@/lib/queries/profile";
import { getCorridorSightings, getMySightings } from "@/lib/queries/sightings";
import { getStableClientSession } from "@/shared/auth/client-session";

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

export async function loadFanHomeRouteData(input: {
  corridorId?: string | null;
}): Promise<FanHomeRouteData> {
  const corridors = await getCorridors();
  const activeCorridor = input.corridorId || null;

  const [nganyas, liveNganyas, follows] = await Promise.all([
    searchNganyas("", activeCorridor || undefined),
    getLiveNow(activeCorridor || undefined),
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

export async function loadDiscoverRouteData(input: {
  search?: string;
  corridorId?: string | null;
  vibe?: string | null;
}): Promise<DiscoverRouteData> {
  const search = input.search?.trim() || "";
  const activeCorridor = input.corridorId || null;
  const activeVibe = input.vibe || null;

  const [corridors, nganyas, liveNganyas, follows] = await Promise.all([
    getCorridors(),
    searchNganyas(search, activeCorridor || undefined),
    getLiveNow(activeCorridor || undefined),
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

export async function loadFollowingRouteData(): Promise<FollowingRouteData> {
  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return {
      isAuthenticated: false,
      followedNganyas: [],
      nganyas: [],
      liveNganyas: [],
      recentSightings: [],
    };
  }

  const [followedNganyas, nganyas, liveNganyas] = await Promise.all([
    getMyFollows(),
    searchNganyas(""),
    getLiveNow(),
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

export async function loadProfileRouteData(): Promise<ProfileRouteData> {
  const session = await getStableClientSession();
  if (!session?.user?.id) {
    return {
      authUser: null,
      profile: null,
      followedNganyas: [],
      liveNganyas: [],
      userSightings: [],
    };
  }

  const [authUser, profile, followedNganyas, liveNganyas, userSightings] =
    await Promise.all([
      getCurrentAuthUser(),
      getCurrentUserProfile(),
      getMyFollows(),
      getLiveNow(),
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

export async function loadSpotRouteData(): Promise<SpotRouteData> {
  const session = await getStableClientSession();
  const [corridors, nganyas, liveNganyas, follows, mySightings] = await Promise.all([
    getCorridors(),
    searchNganyas(""),
    getLiveNow(),
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
