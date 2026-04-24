import {
  Activity,
  Clock,
  Heart,
} from "lucide-react";
import { formatDirectionLabel } from "@/lib/formatters";
import {
  CARD_MAX_VIBE_TAGS,
  CARD_MAX_VIBE_TAGS_WITH_EXTRA,
} from "@/components/ui/Card";
import { formatRelativeTime, toNganyaSlug } from "@/lib/formatters";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";
import { readPlannerStorageContext } from "@/modules/fan/services/planner-storage";
import {
  RECENT_WINDOW_MS,
  type DashboardItem,
  type DashboardStatus,
  type PlannerContext,
} from "./following-types";

export function readPlannerContext(): PlannerContext {
  return readPlannerStorageContext();
}

export function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function formatSeenAge(value: string | null | undefined): string {
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

export function formatPingAge(value: string | null | undefined): string {
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

export function getStatusRank(status: DashboardStatus) {
  if (status === "LIVE_NOW") return 0;
  if (status === "RECENTLY_SEEN") return 1;
  return 2;
}

export function getStatusTone(status: DashboardStatus) {
  if (status === "LIVE_NOW") {
    return "bg-[rgba(57,255,20,0.14)] border-[rgba(57,255,20,0.35)] text-[var(--color-live)]";
  }

  if (status === "RECENTLY_SEEN") {
    return "bg-[var(--color-accent-soft)] border-[rgba(255,0,122,0.35)] text-[var(--color-accent)]";
  }

  return "bg-[rgba(255,255,255,0.04)] border-[var(--glass-border)] text-[var(--color-text-tertiary)]";
}

export function getStatusDisplayLabel(
  item: Pick<DashboardItem, "status" | "statusAt">,
) {
  if (item.status === "LIVE_NOW") return "Live now";
  if (item.status === "RECENTLY_SEEN") return formatSeenAge(item.statusAt);
  return "No fresh sightings";
}

export function getSignalText(
  item: Pick<DashboardItem, "status" | "trustLabel">,
) {
  if (item.status === "OFFLINE") return "No fresh sightings";
  return item.trustLabel;
}

export function buildDashboardItem(
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
  const directionLabel = formatDirectionLabel(directionValue, corridorName);

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

export function sortDashboardItems(items: DashboardItem[]) {
  return [...items].sort((left, right) => {
    const rankDiff = getStatusRank(left.status) - getStatusRank(right.status);
    if (rankDiff !== 0) return rankDiff;

    const scoreDiff = right.sortScore - left.sortScore;
    if (scoreDiff !== 0) return scoreDiff;

    return toTimestamp(right.statusAt) - toTimestamp(left.statusAt);
  });
}

export function buildRecommendation(
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

export function mapDashboardItemToCardProps(item: DashboardItem) {
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
