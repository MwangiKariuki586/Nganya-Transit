import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  Activity,
  Clock,
  Heart,
  MapPinned,
  Radio,
  Sparkles,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Card, {
  CARD_MAX_VIBE_TAGS,
  CARD_MAX_VIBE_TAGS_WITH_EXTRA,
} from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useToast } from "@/components/ui/ToastContainer";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { InlineTableLoader } from "@/components/ui/loading";
import SearchResultsOverlayV2 from "@/components/features/SearchResultsOverlayV2";
import { formatRelativeTime, toNganyaSlug } from "@/lib/formatters";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";
import {
  followNganya,
  unfollowNganya,
  updateFollowAlerts,
} from "@/lib/queries/follows";
import { supabase } from "@/lib/supabase";
import {
  canTrackWithPlannerContext,
  readPlannerStorageContext,
  seedPlannerStorage,
  type PlannerStorageContext,
} from "@/modules/fan/services/planner-storage";
import type { FollowingRouteData } from "@/modules/fan/services/route-data";

const RECENT_WINDOW_MS = 90 * 60 * 1000;

type DashboardStatus = "LIVE_NOW" | "RECENTLY_SEEN" | "OFFLINE";

type PlannerContext = PlannerStorageContext;

interface DashboardItem {
  id: string;
  slug: string;
  name: string;
  corridorId: string | null;
  corridorName: string;
  tags: string[];
  imageUrl: string;
  followers: number;
  isVerified: boolean;
  followCreatedAt: string | null;
  notifyLive: boolean;
  status: DashboardStatus;
  statusLabel: string;
  trustLabel: string;
  statusAt: string | null;
  liveSession: any | null;
  recentSighting: any | null;
  directionLabel: string | null;
  matchLabel: string | null;
  stageLabel: string | null;
  reasonLabel?: string;
  sharedTag?: string | null;
  matchesPlannerRoute: boolean;
  matchesPreferredNganya: boolean;
  sortScore: number;
}

interface FollowingScreenProps {
  data: FollowingRouteData;
}

function readPlannerContext(): PlannerContext {
  return readPlannerStorageContext();
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatSeenAge(value: string | null | undefined): string {
  const timestamp = toTimestamp(value);
  if (!timestamp) return "Seen recently";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );
  if (elapsedSeconds < 60) {
    return `Seen ${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));
  if (elapsedMinutes < 60) {
    return `Seen ${elapsedMinutes}m ago`;
  }

  return `Seen ${formatRelativeTime(value).replace(/^in /, "")}`;
}

function formatPingAge(value: string | null | undefined): string {
  const timestamp = toTimestamp(value);
  if (!timestamp) return "Live now";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );
  if (elapsedSeconds < 60) {
    return `Pinged ${elapsedSeconds}s ago`;
  }

  return `Pinged ${Math.max(1, Math.floor(elapsedSeconds / 60))}m ago`;
}

function getStatusRank(status: DashboardStatus) {
  if (status === "LIVE_NOW") return 0;
  if (status === "RECENTLY_SEEN") return 1;
  return 2;
}

function getStatusTone(status: DashboardStatus) {
  if (status === "LIVE_NOW") {
    return "bg-[rgba(57,255,20,0.14)] border-[rgba(57,255,20,0.35)] text-[var(--color-live)]";
  }

  if (status === "RECENTLY_SEEN") {
    return "bg-[var(--color-accent-soft)] border-[rgba(255,0,122,0.35)] text-[var(--color-accent)]";
  }

  return "bg-[rgba(255,255,255,0.04)] border-[var(--glass-border)] text-[var(--color-text-tertiary)]";
}

function getStatusDisplayLabel(
  item: Pick<DashboardItem, "status" | "statusAt">,
) {
  if (item.status === "LIVE_NOW") return "Live now";
  if (item.status === "RECENTLY_SEEN") return formatSeenAge(item.statusAt);
  return "No fresh sightings";
}

function getSignalText(item: Pick<DashboardItem, "status" | "trustLabel">) {
  if (item.status === "OFFLINE") return "No fresh sightings";
  return item.trustLabel;
}

function buildDashboardItem(
  source: any,
  options: {
    liveById: Map<string, any>;
    recentById: Map<string, any>;
    plannerContext: PlannerContext;
    followMeta?: { notifyLive?: boolean; createdAt?: string | null } | null;
  },
): DashboardItem | null {
  if (!source) return null;

  const id = source.nganya_id || source.id;
  if (!id) return null;

  const liveSession = options.liveById.get(id) || null;
  const recentSighting = options.recentById.get(id) || null;
  const recentSeenAt = toTimestamp(recentSighting?.created_at);
  const isRecentlySeen = Boolean(
    recentSeenAt && Date.now() - recentSeenAt <= RECENT_WINDOW_MS,
  );

  const status: DashboardStatus = liveSession
    ? "LIVE_NOW"
    : isRecentlySeen
      ? "RECENTLY_SEEN"
      : "OFFLINE";

  const corridorId = source.corridor_id || source.nganyas?.corridor_id || null;
  const corridorName =
    source.corridor_name ||
    source.corridors?.name ||
    source.nganyas?.corridors?.name ||
    "Unknown route";
  const tags = source.tags || source.nganyas?.tags || [];
  const preferredId = options.plannerContext.preferredNganya?.id || null;
  const plannerCorridorId =
    options.plannerContext.toPlace?.corridor_id ||
    options.plannerContext.toPlace?.id ||
    null;
  const matchesPlannerRoute = Boolean(
    plannerCorridorId && corridorId && plannerCorridorId === corridorId,
  );
  const matchesPreferredNganya = Boolean(preferredId && preferredId === id);

  const statusLabel =
    status === "LIVE_NOW"
      ? "LIVE NOW"
      : status === "RECENTLY_SEEN"
        ? "RECENTLY SEEN"
        : "OFFLINE";

  const trustLabel =
    status === "LIVE_NOW"
      ? formatPingAge(liveSession?.last_ping_at)
      : recentSighting
        ? formatSeenAge(recentSighting.created_at)
        : "No fresh sightings yet";

  const directionValue =
    liveSession?.direction || recentSighting?.direction || null;
  const directionLabel = directionValue
    ? directionValue.toLowerCase().includes("town")
      ? "→ Town"
      : directionValue.toLowerCase().includes("terminal")
        ? "→ Terminal"
        : directionValue
    : null;

  const matchLabel = matchesPreferredNganya
    ? "Your selected pick"
    : matchesPlannerRoute && options.plannerContext.toPlace?.name
      ? `Useful for ${options.plannerContext.toPlace.name}`
      : null;

  const stageLabel = recentSighting?.stage?.name || null;
  const statusAt =
    liveSession?.last_ping_at ||
    recentSighting?.created_at ||
    options.followMeta?.createdAt ||
    null;

  const sortScore =
    (matchesPreferredNganya ? 4000 : 0) +
    (matchesPlannerRoute ? 2000 : 0) +
    (status === "LIVE_NOW" ? 1000 : status === "RECENTLY_SEEN" ? 500 : 0) +
    Math.min(250, source.follower_count || 0);

  return {
    id,
    slug:
      source.slug ||
      source.nganya_slug ||
      toNganyaSlug(source.nganya_name || source.name),
    name: source.nganya_name || source.name,
    corridorId,
    corridorName,
    tags,
    imageUrl: pickPrimaryNganyaImageUrl(source) ?? "",
    followers: source.follower_count || 0,
    isVerified: Boolean(source.is_verified),
    followCreatedAt: options.followMeta?.createdAt || null,
    notifyLive: Boolean(options.followMeta?.notifyLive),
    status,
    statusLabel,
    trustLabel,
    statusAt,
    liveSession,
    recentSighting,
    directionLabel,
    matchLabel,
    stageLabel,
    matchesPlannerRoute,
    matchesPreferredNganya,
    sortScore,
  };
}

function sortDashboardItems(items: DashboardItem[]) {
  return [...items].sort((left, right) => {
    const rankDiff = getStatusRank(left.status) - getStatusRank(right.status);
    if (rankDiff !== 0) return rankDiff;

    const scoreDiff = right.sortScore - left.sortScore;
    if (scoreDiff !== 0) return scoreDiff;

    return toTimestamp(right.statusAt) - toTimestamp(left.statusAt);
  });
}

function buildRecommendation(
  candidate: any,
  params: {
    liveById: Map<string, any>;
    recentById: Map<string, any>;
    plannerContext: PlannerContext;
    followedItems: DashboardItem[];
    followedCorridorCounts: Map<string, number>;
  },
): DashboardItem | null {
  const item = buildDashboardItem(candidate, {
    liveById: params.liveById,
    recentById: params.recentById,
    plannerContext: params.plannerContext,
  });

  if (!item) return null;

  const plannerCorridorId =
    params.plannerContext.toPlace?.corridor_id ||
    params.plannerContext.toPlace?.id ||
    null;
  const routeMatch = Boolean(
    plannerCorridorId &&
    item.corridorId &&
    plannerCorridorId === item.corridorId,
  );

  let reasonLabel: string | null = null;
  let sharedTag: string | null = null;
  let reasonScore = 0;

  const similarFollow = params.followedItems.find((followed) => {
    const match = followed.tags.find((tag) => item.tags.includes(tag));
    if (match) {
      sharedTag = match;
      return true;
    }
    return false;
  });

  if (
    routeMatch &&
    item.status === "LIVE_NOW" &&
    params.plannerContext.toPlace?.name
  ) {
    reasonLabel = `Trending on ${params.plannerContext.toPlace.name}`;
    reasonScore += 4000;
  } else if (
    routeMatch &&
    item.status === "RECENTLY_SEEN" &&
    params.plannerContext.toPlace?.name
  ) {
    reasonLabel = `Recently spotted near ${params.plannerContext.toPlace.name}`;
    reasonScore += 3500;
  } else if (similarFollow && sharedTag) {
    reasonLabel = `Similar to ${similarFollow.name}`;
    reasonScore += 3000;
  } else if (
    item.corridorId &&
    params.followedCorridorCounts.has(item.corridorId) &&
    item.corridorName
  ) {
    reasonLabel =
      item.status === "LIVE_NOW"
        ? "Trending on your followed corridor"
        : `Popular on ${item.corridorName}`;
    reasonScore += 2000;
  }

  if (!reasonLabel) return null;

  item.reasonLabel = reasonLabel;
  item.sharedTag = sharedTag;
  item.sortScore += reasonScore;
  return item;
}

function mapDashboardItemToCardProps(item: DashboardItem) {
  const directionOrStage =
    item.directionLabel ||
    item.stageLabel ||
    (item.notifyLive && item.status === "OFFLINE" ? "Alerts on" : null);
  const vibeTags = directionOrStage
    ? [
        directionOrStage,
        ...item.tags.slice(0, CARD_MAX_VIBE_TAGS_WITH_EXTRA - 1),
      ]
    : item.tags.slice(0, CARD_MAX_VIBE_TAGS);
  const signalText = getSignalText(item);

  return {
    nganya: {
      id: item.id,
      slug: item.slug,
      name: item.name,
      corridor: item.corridorName,
      vibeTags,
      followers: item.followers,
      sightingsToday: item.status === "OFFLINE" ? 0 : 1,
      lastSeen: getStatusDisplayLabel(item),
      lastSeenMinutes: 0,
      confidence:
        item.status === "LIVE_NOW"
          ? "high"
          : item.status === "RECENTLY_SEEN"
            ? "med"
            : "low",
      isLive: item.status === "LIVE_NOW",
      isNewBuild: item.tags.includes("NEW_BUILD"),
      imageUrl: item.imageUrl,
      description: "",
    } as any,
    subtitle: item.matchLabel || item.corridorName,
    imageBadge: {
      label: signalText,
      className: getStatusTone(item.status),
    },
    extraTag: {
      label:
        item.followers > 0
          ? `${item.followers.toLocaleString()} fans`
          : "Culture pick",
      className:
        "border-[rgba(57,255,20,0.22)] bg-[rgba(57,255,20,0.1)] text-[var(--color-live)]",
    },
    footerContent: (
      <div className="flex items-center gap-4 text-[var(--color-text-tertiary)] text-xs">
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3" />
          {item.followers?.toLocaleString() ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {item.status === "LIVE_NOW"
            ? "Live now"
            : item.status === "RECENTLY_SEEN"
              ? "Seen recently"
              : "Offline"}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3 h-3" />
          {getStatusDisplayLabel(item)}
        </span>
      </div>
    ),
  };
}

export function FollowingScreenSkeleton() {
  return (
    <div className="page-container space-y-8 pt-8 pb-10 md:pt-12 md:pb-16">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-9 w-40 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
          <div className="h-4 w-72 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        </div>
        <div className="h-11 w-48 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
      </div>

      <div className="h-20 animate-skeleton rounded-[var(--radius-xl)] bg-[var(--glass-bg)]" />

      <section className="space-y-4">
        <div className="h-6 w-52 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} className="h-full" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-6 w-40 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} className="h-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function FollowingScreen({ data }: FollowingScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const { showErrorToast, addToast } = useToast();
  const [plannerContext, setPlannerContext] = useState<PlannerContext>({
    toPlace: null,
    fromStage: null,
    preferredNganya: null,
    preference: "ANY",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutatingIds, setMutatingIds] = useState<Record<string, boolean>>({});
  const [followOverrides, setFollowOverrides] = useState<
    Record<string, { isFollowing?: boolean; notifyLive?: boolean }>
  >({});
  const [trackingItem, setTrackingItem] = useState<DashboardItem | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const {
    isAuthenticated,
    followedNganyas,
    nganyas,
    liveNganyas,
    recentSightings,
  } = data;

  useEffect(() => {
    setPlannerContext(readPlannerContext());
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const liveById = useMemo(
    () =>
      new Map<string, any>(
        (liveNganyas || []).map((item: any) => [item.nganya_id, item]),
      ),
    [liveNganyas],
  );

  const recentById = useMemo(() => {
    const next = new Map<string, any>();
    for (const sighting of recentSightings || []) {
      if (!next.has(sighting.nganya_id)) {
        next.set(sighting.nganya_id, sighting);
      }
    }
    return next;
  }, [recentSightings]);

  const followedItems = useMemo(() => {
    const enriched = followedNganyas
      .map((follow: any) => {
        const override = followOverrides[follow.nganya_id] || {};
        if (override.isFollowing === false) return null;

        return buildDashboardItem(follow.nganyas, {
          liveById,
          recentById,
          plannerContext,
          followMeta: {
            notifyLive: override.notifyLive ?? follow.notify_live,
            createdAt: follow.created_at,
          },
        });
      })
      .filter(Boolean) as DashboardItem[];

    return sortDashboardItems(enriched);
  }, [followedNganyas, followOverrides, liveById, recentById, plannerContext]);

  const followedIds = useMemo(
    () => new Set(followedItems.map((item) => item.id)),
    [followedItems],
  );

  const followedCorridorCounts = useMemo(() => {
    const next = new Map<string, number>();
    for (const item of followedItems) {
      if (!item.corridorId) continue;
      next.set(item.corridorId, (next.get(item.corridorId) || 0) + 1);
    }
    return next;
  }, [followedItems]);

  const recommendations = useMemo(() => {
    const items = nganyas
      .filter(
        (nganya) =>
          !followedIds.has(nganya.id) &&
          followOverrides[nganya.id]?.isFollowing !== true,
      )
      .map((candidate) =>
        buildRecommendation(candidate, {
          liveById,
          recentById,
          plannerContext,
          followedItems,
          followedCorridorCounts,
        }),
      )
      .filter(Boolean) as DashboardItem[];

    return sortDashboardItems(items).slice(0, 4);
  }, [
    nganyas,
    followedIds,
    followOverrides,
    liveById,
    recentById,
    plannerContext,
    followedItems,
    followedCorridorCounts,
  ]);

  const activeLiveItems = useMemo(() => {
    const active = followedItems.filter((item) => item.status !== "OFFLINE");
    const routeMatches = active.filter(
      (item) => item.matchesPlannerRoute || item.matchesPreferredNganya,
    );
    return (routeMatches.length > 0 ? routeMatches : active).slice(0, 4);
  }, [followedItems]);

  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filterChips = useMemo(() => {
    const corridorChips = Array.from(followedCorridorCounts.entries())
      .slice(0, 2)
      .map(([corridorId]) => {
        const label =
          followedItems.find((item) => item.corridorId === corridorId)
            ?.corridorName || "Corridor";
        return { id: `corridor:${corridorId}`, label };
      });

    const topTags = Array.from(
      followedItems.reduce<Map<string, number>>((map, item) => {
        for (const tag of item.tags) {
          map.set(tag, (map.get(tag) || 0) + 1);
        }
        return map;
      }, new Map<string, number>()),
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
      .map(([tag]) => ({ id: `tag:${tag}`, label: tag }));

    return [
      { id: "all", label: "All" },
      { id: "live", label: "Live now" },
      { id: "recent", label: "Recently seen" },
      ...corridorChips,
      ...topTags,
    ];
  }, [followedCorridorCounts, followedItems]);

  useEffect(() => {
    if (!filterChips.some((chip) => chip.id === activeFilter)) {
      setActiveFilter("all");
    }
  }, [filterChips, activeFilter]);

  const filteredFollowedItems = useMemo(() => {
    if (activeFilter === "all") return followedItems;
    if (activeFilter === "live") {
      return followedItems.filter((item) => item.status === "LIVE_NOW");
    }
    if (activeFilter === "recent") {
      return followedItems.filter((item) => item.status === "RECENTLY_SEEN");
    }
    if (activeFilter.startsWith("corridor:")) {
      return followedItems.filter(
        (item) => item.corridorId === activeFilter.replace("corridor:", ""),
      );
    }
    if (activeFilter.startsWith("tag:")) {
      const tag = activeFilter.replace("tag:", "");
      return followedItems.filter((item) => item.tags.includes(tag));
    }
    return followedItems;
  }, [activeFilter, followedItems]);

  const liveCount = followedItems.filter(
    (item) => item.status === "LIVE_NOW",
  ).length;
  const recentCount = followedItems.filter(
    (item) => item.status === "RECENTLY_SEEN",
  ).length;
  const plannerRouteLabel = plannerContext.toPlace?.name || null;

  const queueRefresh = async () => {
    if (typeof window === "undefined") {
      await router.invalidate();
      return;
    }

    if (refreshTimerRef.current) return;

    setIsRefreshing(true);
    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        await router.invalidate();
      } finally {
        setIsRefreshing(false);
        refreshTimerRef.current = null;
      }
    }, 250);
  };

  useEffect(() => {
    if (!isAuthenticated || followedItems.length === 0) return;

    const corridorIds = Array.from(
      new Set(followedItems.map((item) => item.corridorId).filter(Boolean)),
    ) as string[];

    if (corridorIds.length === 0) return;

    const channels = corridorIds.map((corridorId) =>
      supabase
        .channel(`following_dashboard_${corridorId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_sessions",
            filter: `corridor_id=eq.${corridorId}`,
          },
          () => queueRefresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sightings",
            filter: `corridor_id=eq.${corridorId}`,
          },
          () => queueRefresh(),
        )
        .subscribe(),
    );

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [isAuthenticated, followedItems]);

  const runMutation = async (id: string, task: () => Promise<void>) => {
    setMutatingIds((current) => ({ ...current, [id]: true }));

    try {
      await task();
      await queueRefresh();
    } catch (error) {
      showErrorToast(error, "Failed to update follow.");
      throw error;
    } finally {
      setMutatingIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  const handleToggleFollow = async (
    item: DashboardItem,
    isFollowing: boolean,
  ) => {
    const previous = followOverrides[item.id];

    setFollowOverrides((current) => ({
      ...current,
      [item.id]: {
        ...current[item.id],
        isFollowing: !isFollowing,
      },
    }));

    try {
      await runMutation(item.id, async () => {
        if (isFollowing) {
          await unfollowNganya(item.id);
        } else {
          await followNganya(item.id);
        }
      });
    } catch {
      setFollowOverrides((current) => {
        const next = { ...current };
        if (previous) {
          next[item.id] = previous;
        } else {
          delete next[item.id];
        }
        return next;
      });
    }
  };

  const handleToggleAlerts = async (
    item: DashboardItem,
    nextNotifyLive: boolean,
  ) => {
    const previous = followOverrides[item.id];

    setFollowOverrides((current) => ({
      ...current,
      [item.id]: {
        ...current[item.id],
        notifyLive: nextNotifyLive,
      },
    }));

    try {
      await runMutation(item.id, async () => {
        await updateFollowAlerts(item.id, nextNotifyLive);
      });
    } catch {
      setFollowOverrides((current) => {
        const next = { ...current };
        if (previous) {
          next[item.id] = previous;
        } else {
          delete next[item.id];
        }
        return next;
      });
    }
  };

  const planRideFor = (
    item?: DashboardItem | null,
    options?: { useRecentStage?: boolean },
  ) => {
    seedPlannerStorage(plannerContext, {
      ...(item || undefined),
      stageId:
        options?.useRecentStage && item?.recentSighting?.stage_id
          ? item.recentSighting.stage_id
          : undefined,
      stageName:
        options?.useRecentStage && item?.stageLabel
          ? item.stageLabel
          : undefined,
    });

    if (options?.useRecentStage && item?.stageLabel) {
      addToast(
        `Planner set to ${item.stageLabel} on ${item.corridorName} for ${item.name}.`,
        "info",
      );
    }

    navigate({
      to: "/",
      search: {
        corridor:
          item?.corridorId ||
          plannerContext.toPlace?.corridor_id ||
          plannerContext.toPlace?.id ||
          undefined,
      } as any,
    });
  };

  const canTrackItem = (item: DashboardItem) =>
    canTrackWithPlannerContext(plannerContext, item);

  const handlePrimaryAction = (item: DashboardItem) => {
    if (
      (item.status === "LIVE_NOW" || item.status === "RECENTLY_SEEN") &&
      canTrackItem(item)
    ) {
      setTrackingItem(item);
      return;
    }

    if (item.status === "OFFLINE" && !item.notifyLive) {
      void handleToggleAlerts(item, true);
      return;
    }

    if (item.status === "RECENTLY_SEEN") {
      navigate({
        to: "/nganya/$slug",
        params: { slug: item.slug },
      });
      return;
    }

    planRideFor(item);
  };

  const handleSecondaryAction = (item: DashboardItem) => {
    if (item.status === "OFFLINE" && item.notifyLive) {
      navigate({
        to: "/discover",
        search: {
          corridor: item.corridorId || undefined,
          vibe: item.tags[0] || undefined,
        } as any,
      });
      return;
    }

    planRideFor(item);
  };

  const getPrimaryLabel = (item: DashboardItem) => {
    if (item.status === "LIVE_NOW" && canTrackItem(item)) return "Track";
    if (item.status === "LIVE_NOW") return "Plan ride";
    if (item.status === "RECENTLY_SEEN" && canTrackItem(item)) return "Track";
    if (item.status === "RECENTLY_SEEN") return "View profile";
    if (!item.notifyLive) return "Notify me";
    return "Plan ride";
  };

  const getSecondaryLabel = (item: DashboardItem) => {
    if (item.status === "OFFLINE" && item.notifyLive) return "Find similar";
    return "Plan ride";
  };

  const headerTarget =
    followedItems.find(
      (item) => item.matchesPlannerRoute || item.matchesPreferredNganya,
    ) ||
    followedItems[0] ||
    null;

  const emptyRecommendations = useMemo(() => {
    if (followedItems.length > 0) return [];

    return sortDashboardItems(
      (nganyas || [])
        .map((candidate) =>
          buildDashboardItem(candidate, {
            liveById,
            recentById,
            plannerContext,
          }),
        )
        .filter(Boolean) as DashboardItem[],
    ).slice(0, 4);
  }, [followedItems.length, nganyas, liveById, recentById, plannerContext]);

  if (!isAuthenticated) {
    return (
      <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
        <EmptyState
          variant="no-following"
          title="Sign in to follow nganyas"
          message="Your live follows, alerts, and route-aware picks stay tied to your account."
          actionLabel="Sign In"
          onAction={() => navigate({ to: "/signin" })}
        />
      </div>
    );
  }

  return (
    <>
      <div className="page-container space-y-8 pt-8 pb-10 md:pt-12 md:pb-16">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-tag text-[var(--color-accent)]">Fan dashboard</p>
            <h1 className="text-h1">Following</h1>
            <p className="max-w-3xl text-body-sm text-[var(--color-text-secondary)]">
              Catch the nganyas you follow while they are live, recently
              spotted, or lining up for the route you already ride.
            </p>
          </div>

          {/* <Button variant="primary" onClick={() => planRideFor(headerTarget)}>
            Plan a ride with followed nganyas
          </Button> */}
        </section>

        {/* {plannerRouteLabel ? (
          <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[linear-gradient(135deg,rgba(255,0,122,0.14),rgba(0,212,255,0.08))] p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <MapPinned className="h-4 w-4 text-[var(--color-cyan)]" />
                  On your route now
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {plannerRouteLabel}
                  {plannerContext.fromStage?.name
                    ? ` from ${plannerContext.fromStage.name}`
                    : ""}
                  {liveCount > 0
                    ? ` · ${liveCount} live from your follows`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label={`Useful for ${plannerRouteLabel}`}
                  variant="route"
                />
                {plannerContext.preferredNganya?.name ? (
                  <Chip
                    label={`Watching ${plannerContext.preferredNganya.name}`}
                    variant="route"
                  />
                ) : null}
                {recentCount > 0 ? (
                  <Chip
                    label={`${recentCount} recently seen`}
                    variant="route"
                  />
                ) : null}
              </div>
            </div>
          </section>
        ) : null} */}

        {isRefreshing ? <InlineTableLoader /> : null}

        {followedItems.length === 0 ? (
          <>
            <EmptyState
              variant="no-following"
              title="Follow nganyas to keep tabs on the culture"
              message="Build your live dashboard first, then jump straight into tracking, alerts, and route-aware picks."
              actionLabel="Discover nganyas"
              onAction={() => navigate({ to: "/discover" })}
            />

            {emptyRecommendations.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[var(--color-live)]" />
                  <h2 className="text-h3">Live right now</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {emptyRecommendations.map((item) => (
                    <Card
                      key={item.id}
                      {...mapDashboardItemToCardProps(item)}
                      isFollowing={false}
                      imageBadge={{
                        label: getSignalText(item),
                        className: getStatusTone(item.status),
                      }}
                      isMutating={Boolean(mutatingIds[item.id])}
                      onFollow={() => void handleToggleFollow(item, false)}
                      primaryAction={{
                        label: getPrimaryLabel(item),
                        onClick: () => handlePrimaryAction(item),
                      }}
                      secondaryAction={{
                        label: getSecondaryLabel(item),
                        onClick: () => handleSecondaryAction(item),
                        variant: "secondary",
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[var(--color-live)]" />
                    <h2 className="text-h3">Live from your follows</h2>
                  </div>
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    Followed nganyas that matter right now: live, recently seen,
                    or matching your route.
                  </p>
                </div>
                <div className="hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)] lg:block">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {liveCount}
                  </span>{" "}
                  live
                  {" · "}
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {recentCount}
                  </span>{" "}
                  recently seen
                </div>
              </div>

              {activeLiveItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeLiveItems.map((item) => (
                    <Card
                      key={item.id}
                      {...mapDashboardItemToCardProps(item)}
                      isFollowing
                      isMutating={Boolean(mutatingIds[item.id])}
                      onFollow={() => void handleToggleFollow(item, true)}
                      primaryAction={{
                        label: getPrimaryLabel(item),
                        onClick: () => handlePrimaryAction(item),
                      }}
                      secondaryAction={{
                        label: getSecondaryLabel(item),
                        onClick: () => handleSecondaryAction(item),
                        variant: "secondary",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-6">
                  <h3 className="text-h4">
                    None of your follows are live right now
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Keep alerts on, plan a ride from the same corridor, or use
                    recommendations below to catch the next one moving.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => planRideFor(headerTarget)}
                    >
                      Plan a ride
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const firstOffline = followedItems.find(
                          (item) =>
                            item.status === "OFFLINE" && !item.notifyLive,
                        );
                        if (firstOffline) {
                          void handleToggleAlerts(firstOffline, true);
                        }
                      }}
                    >
                      Turn on alerts
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <h2 className="text-h3">All followed</h2>
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    Sorted by live now, recently seen, then offline, with your
                    route matches first.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {filterChips.map((chip) => (
                    <Chip
                      key={chip.id}
                      label={chip.label}
                      variant="route"
                      isActive={activeFilter === chip.id}
                      onClick={() => setActiveFilter(chip.id)}
                    />
                  ))}
                </div>
              </div>

              {filteredFollowedItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredFollowedItems.map((item) => (
                    <Card
                      key={item.id}
                      {...mapDashboardItemToCardProps(item)}
                      isFollowing
                      isMutating={Boolean(mutatingIds[item.id])}
                      onFollow={() => void handleToggleFollow(item, true)}
                      primaryAction={{
                        label: getPrimaryLabel(item),
                        onClick: () => handlePrimaryAction(item),
                      }}
                      secondaryAction={{
                        label: getSecondaryLabel(item),
                        onClick: () => handleSecondaryAction(item),
                        variant: "secondary",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 text-sm text-[var(--color-text-secondary)]">
                  Nothing matches the current filter. Try a different corridor
                  or tag.
                </div>
              )}
            </section>

            {recommendations.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--color-cyan)]" />
                  <div>
                    <h2 className="text-h3">Recommended for you</h2>
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      Contextual picks with a clear reason, not generic filler.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {recommendations.map((item) => (
                    <Card
                      key={item.id}
                      {...mapDashboardItemToCardProps(item)}
                      isFollowing={false}
                      subtitle={
                        item.reasonLabel || item.matchLabel || item.corridorName
                      }
                      isMutating={Boolean(mutatingIds[item.id])}
                      onFollow={() => void handleToggleFollow(item, false)}
                      primaryAction={{
                        label: "Follow",
                        onClick: () => void handleToggleFollow(item, false),
                      }}
                      secondaryAction={{
                        label: "Find similar",
                        onClick: () =>
                          navigate({
                            to: "/discover",
                            search: {
                              corridor: item.corridorId || undefined,
                              vibe: item.sharedTag || item.tags[0] || undefined,
                            } as any,
                          }),
                        variant: "secondary",
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        <aside className="hidden lg:block">
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
              <Activity className="h-4 w-4 text-[var(--color-accent)]" />
              Follow summary
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span>Following</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {followedItems.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Live now</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {liveCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Recently seen</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {recentCount}
                </span>
              </div>
              {plannerRouteLabel ? (
                <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-3 py-2 text-xs">
                  Active route:{" "}
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {plannerRouteLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {trackingItem && plannerContext.toPlace && plannerContext.fromStage ? (
        <SearchResultsOverlayV2
          isOpen
          onClose={() => setTrackingItem(null)}
          fromStage={plannerContext.fromStage}
          toPlace={plannerContext.toPlace}
          preference="SPECIFIC"
          preferredNganya={{ id: trackingItem.id, name: trackingItem.name }}
        />
      ) : null}
    </>
  );
}
