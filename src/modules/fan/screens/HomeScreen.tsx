import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import CatchabilityBadge from "@/components/ui/CatchabilityBadge";
import LiveBadge from "@/components/ui/LiveBadge";
import SearchInput from "@/components/ui/SearchInput";
import Skeleton from "@/components/ui/Skeleton";
import TrackingSignalBadge from "@/components/ui/TrackingSignalBadge";
import {
  formatDirectionLabel,
  formatRelativeTime,
  toNganyaSlug,
} from "@/lib/formatters";
import { getTrackingSignalState } from "@/lib/tracking-signal";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";
import { Clock, TrendingUp, ChevronRight, BellRing, ShieldAlert } from "lucide-react";
import WhereToCard, {
  type PlannerFiltersValue,
  type RideSearchPayload,
} from "@/components/features/WhereToCard";
import SearchResultsOverlayV2 from "@/components/features/SearchResultsOverlayV2";
import LiveCorridorMap from "@/components/features/tracking/LiveCorridorMap";
import type { JourneyResult } from "@/lib/types/journey";
import { searchNganyaJourney } from "@/lib/queries/discover";
import { supabase } from "@/lib/supabase";
import {
  fetchNganyaPosition,
  fetchStagePosition,
} from "@/lib/queries/tracking";
import { fetchOsrmRoute } from "@/lib/osrm";
import { followNganya, unfollowNganya } from "@/lib/queries/follows";
import { toAppError } from "@/shared/errors/app-error";
import {
  applyPlannerSeed,
  canTrackWithPlannerContext,
  getPlannerCorridorId,
  reconcilePlannerContext,
} from "@/modules/fan/services/planner-storage";
import {
  getPlannerAssistStatus,
  sortPlannerRideOptions,
  type PlannerRideOption,
} from "@/modules/fan/services/planner-assist";
import type { FanHomeRouteData } from "@/modules/fan/services/route-data";
import { usePlannerFilters } from "@/modules/fan/hooks/usePlannerFilters";
import { deriveVisibleNganyaIds } from "@/modules/fan/services/derive-visible-nganya-ids";

interface HomeScreenProps {
  data: FanHomeRouteData;
  activeCorridor: string | null;
  onCorridorChange: (corridorId: string | null) => void;
  onSearchChange: (
    search: string,
    activeCorridor: string | null,
    activeVibe: string | null,
  ) => void;
  showAllRecent: boolean;
}

type RecentSightingFilter = "ALL" | "ON_ROUTE" | "HIGH_ACTIVITY";

interface AggregatedRecentSightingRow {
  key: string;
  nganyaId: string;
  slug: string;
  nganyaName: string;
  corridorId: string | null;
  corridorName: string;
  direction: string | null;
  directionLabel: string | null;
  stageName: string | null;
  lastSeenAt: string;
  lastSeenMinutes: number;
  sightingsCountRecent: number;
  distinctUsersCount: number;
  confidenceLevel: "HIGH" | "MED" | "LOW";
  signalLabel: string;
  statusTone: "hot" | "warm" | "stale";
  onRoute: boolean;
}

interface BrowseCardActionItem {
  id: string;
  slug: string;
  name: string;
  corridorId: string | null;
  corridorName: string;
  isLive: boolean;
}

interface PlannerRiskPrompt {
  key: string;
  reason: "risky" | "stale" | "missing";
  alternative: PlannerRideOption | null;
}

const getDirectionLabel = formatDirectionLabel;

function getMinutesSince(isoDate: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000),
  );
}

function getRecencyTone(minutes: number): "hot" | "warm" | "stale" {
  if (minutes <= 2) return "hot";
  if (minutes <= 15) return "warm";
  return "stale";
}

function getRecencyLabel(minutes: number, isoDate: string) {
  if (minutes <= 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  return formatRelativeTime(isoDate);
}

function aggregateRecentSightings(params: {
  sightings: any[];
  activeCorridor: string | null;
  corridors: any[];
}) {
  const grouped = new Map<string, AggregatedRecentSightingRow>();
  const recentUserKeysByGroup = new Map<string, Set<string>>();
  const corridorNameById = new Map(
    (params.corridors || []).map((corridor: any) => [
      corridor.id,
      corridor.name,
    ]),
  );

  for (const sighting of params.sightings) {
    const nganyaId = sighting.nganya_id || sighting.nganyaId;
    if (!nganyaId) continue;

    const corridorId = sighting.corridor_id || null;
    const corridorName =
      sighting.nganya?.corridors?.name ||
      (corridorId ? corridorNameById.get(corridorId) : null) ||
      sighting.corridor_name ||
      sighting.corridor ||
      "Route unavailable";
    const direction = sighting.direction || null;
    const key = `${nganyaId}:${corridorId || "unknown"}:${direction || "unknown"}`;
    const lastSeenAt = sighting.created_at;
    if (!lastSeenAt) continue;

    const lastSeenMinutes = getMinutesSince(lastSeenAt);
    if (lastSeenMinutes > 15) continue;
    const authorKey = sighting.user?.handle || sighting.user_id || "anonymous";
    const existing = grouped.get(key);

    if (!existing) {
      const sightingsCountRecent = lastSeenMinutes <= 15 ? 1 : 0;
      const distinctUsersCount = lastSeenMinutes <= 15 ? 1 : 0;
      const confidenceLevel =
        lastSeenMinutes <= 2 ? "HIGH" : lastSeenMinutes <= 15 ? "MED" : "LOW";
      const signalLabel =
        distinctUsersCount > 1
          ? `${distinctUsersCount} riders confirmed`
          : sightingsCountRecent > 1
            ? `${sightingsCountRecent} sightings`
            : confidenceLevel === "HIGH"
              ? "Live signal"
              : confidenceLevel === "MED"
                ? "Seen recently"
                : "Low activity";

      grouped.set(key, {
        key,
        nganyaId,
        slug: toNganyaSlug(
          sighting.nganya?.name || sighting.nganyaName || "nganya",
        ),
        nganyaName:
          sighting.nganya?.name || sighting.nganyaName || "Unknown nganya",
        corridorId,
        corridorName,
        direction,
        directionLabel: getDirectionLabel(direction, corridorName),
        stageName: sighting.stage?.name || null,
        lastSeenAt,
        lastSeenMinutes,
        sightingsCountRecent,
        distinctUsersCount,
        confidenceLevel,
        signalLabel,
        statusTone: getRecencyTone(lastSeenMinutes),
        onRoute: Boolean(
          params.activeCorridor && corridorId === params.activeCorridor,
        ),
      });
      if (lastSeenMinutes <= 15) {
        recentUserKeysByGroup.set(key, new Set([authorKey]));
      }
      continue;
    }

    const isNewer =
      new Date(lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime();
    const updatedRecentCount =
      existing.sightingsCountRecent + (lastSeenMinutes <= 15 ? 1 : 0);
    const recentUserKeys = recentUserKeysByGroup.get(key) || new Set<string>();
    if (lastSeenMinutes <= 15) {
      recentUserKeys.add(authorKey);
      recentUserKeysByGroup.set(key, recentUserKeys);
    }
    const distinctUsersCount = recentUserKeys.size;

    const referenceMinutes = isNewer
      ? lastSeenMinutes
      : existing.lastSeenMinutes;
    const confidenceLevel =
      updatedRecentCount >= 2 || distinctUsersCount >= 2
        ? "HIGH"
        : referenceMinutes <= 15
          ? "MED"
          : "LOW";

    const signalLabel =
      distinctUsersCount >= 2
        ? `${distinctUsersCount} riders confirmed`
        : updatedRecentCount >= 2
          ? `${updatedRecentCount} sightings`
          : confidenceLevel === "HIGH"
            ? "Just spotted"
            : confidenceLevel === "MED"
              ? "Seen recently"
              : "Low activity";

    grouped.set(key, {
      ...existing,
      stageName: isNewer
        ? sighting.stage?.name || existing.stageName
        : existing.stageName,
      lastSeenAt: isNewer ? lastSeenAt : existing.lastSeenAt,
      lastSeenMinutes: Math.min(existing.lastSeenMinutes, lastSeenMinutes),
      statusTone: getRecencyTone(
        Math.min(existing.lastSeenMinutes, lastSeenMinutes),
      ),
      sightingsCountRecent: updatedRecentCount,
      distinctUsersCount,
      confidenceLevel,
      signalLabel,
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.onRoute !== right.onRoute) return left.onRoute ? -1 : 1;
    return (
      new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime()
    );
  });
}

export default function HomeScreen({
  data,
  activeCorridor,
  onCorridorChange,
  onSearchChange,
  showAllRecent,
}: HomeScreenProps) {
  const router = useRouter();
  const { showErrorToast, addToast } = useToast();
  const { plannerContext, setPlannerContext, clearPlannerContext } =
    usePlannerFilters();
  const [plannerResults, setPlannerResults] = useState<JourneyResult[]>([]);
  const [plannerTracking, setPlannerTracking] = useState<JourneyResult | null>(
    null,
  );
  const [plannerRouteLine, setPlannerRouteLine] = useState<{
    coordinates: [number, number][];
  } | null>(null);
  const [plannerRouteEtaSeconds, setPlannerRouteEtaSeconds] = useState<
    number | null
  >(null);
  const [plannerRouteDistanceMeters, setPlannerRouteDistanceMeters] = useState<
    number | null
  >(null);
  const plannerRouteAbortRef = useRef<AbortController | null>(null);
  const plannerRouteKeyRef = useRef<string | null>(null);
  const [plannerRouteLoading, setPlannerRouteLoading] = useState(false);
  const plannerRealtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [trackingRow, setTrackingRow] =
    useState<AggregatedRecentSightingRow | null>(null);
  const [trackingNganya, setTrackingNganya] =
    useState<BrowseCardActionItem | null>(null);
  const [plannerSeed, setPlannerSeed] = useState(0);
  const [recentFilter, setRecentFilter] = useState<RecentSightingFilter>("ALL");
  const [rideWatchScrollToken, setRideWatchScrollToken] = useState(0);
  const [watchedRideId, setWatchedRideId] = useState<string | null>(null);
  const [plannerRiskPrompt, setPlannerRiskPrompt] =
    useState<PlannerRiskPrompt | null>(null);
  const [dismissedRiskKey, setDismissedRiskKey] = useState<string | null>(null);
  const [plannerAlertIds, setPlannerAlertIds] = useState<Set<string>>(
    () => new Set(),
  );
  const plannerMapSectionRef = useRef<HTMLElement>(null);
  const rideWatchSectionRef = useRef<HTMLElement>(null);
  const plannerMapScrollMargin = "calc(var(--top-nav-height) + 16px)";
  const rideWatchScrollMargin = "calc(var(--top-nav-height) + 16px)";
  const {
    search,
    activeCorridor: _dataCorridor,
    activeVibe,
    corridors,
    nganyas,
    liveNganyas,
    recentSightings,
    followedIds,
  } = data;

  const toggleFollow = async (id: string) => {
    try {
      if (followedIds.has(id)) {
        await unfollowNganya(id);
      } else {
        await followNganya(id);
      }
      await router.invalidate();
    } catch {
      showErrorToast("Failed to update follow.");
    }
  };

  const turnOnPlannerAlerts = async (ride: PlannerRideOption) => {
    try {
      await followNganya(ride.nganya_id);
      setPlannerAlertIds((current) => new Set(current).add(ride.nganya_id));
      addToast(`Alerts on for ${ride.nganya_name}.`, "success");
      await router.invalidate();
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === "AUTH_REQUIRED") {
        addToast("Sign in to keep ride alerts on.", "info");
        router.navigate({ to: "/signin" });
        return;
      }
      showErrorToast("Failed to turn on ride alerts.");
    }
  };

  const activeCorridorName = useMemo(
    () => corridors.find((c) => c.id === activeCorridor)?.name || null,
    [corridors, activeCorridor],
  );

  const filteredNganyas = useMemo(() => {
    return nganyas.filter((n) => {
      const matchesCorridor =
        !activeCorridor || n.corridor_id === activeCorridor;
      const matchesVibe =
        !activeVibe || (n.tags && n.tags.includes(activeVibe));
      return matchesCorridor && matchesVibe;
    });
  }, [nganyas, activeCorridor, activeVibe]);

  const filteredLiveNganyas = useMemo(
    () =>
      activeCorridor
        ? liveNganyas.filter((n) => n.corridor_id === activeCorridor)
        : liveNganyas,
    [liveNganyas, activeCorridor],
  );

  const filteredRecentSightings = useMemo(() => {
    if (!activeCorridor) return recentSightings;
    const routeName = (activeCorridorName || "").toLowerCase();
    return recentSightings.filter((s: any) => {
      if (s.corridor_id) return s.corridor_id === activeCorridor;
      const label = (s.corridor || s.corridor_name || "").toLowerCase();
      if (!routeName) return false;
      return label.includes(routeName) || routeName.includes(label);
    });
  }, [recentSightings, activeCorridor, activeCorridorName]);

  const recentSightingsSource = useMemo(
    () =>
      filteredRecentSightings.length > 0
        ? filteredRecentSightings
        : recentSightings,
    [filteredRecentSightings, recentSightings],
  );

  const aggregatedRecentSightings = useMemo(
    () =>
      aggregateRecentSightings({
        sightings: recentSightingsSource,
        activeCorridor,
        corridors,
      }),
    [recentSightingsSource, activeCorridor, corridors],
  );

  const recentSummaryCount = useMemo(
    () => aggregatedRecentSightings.length,
    [aggregatedRecentSightings],
  );

  const filteredAggregatedRecentSightings = useMemo(() => {
    if (recentFilter === "ON_ROUTE") {
      return aggregatedRecentSightings.filter((row) => row.onRoute);
    }
    if (recentFilter === "HIGH_ACTIVITY") {
      return aggregatedRecentSightings.filter(
        (row) => row.sightingsCountRecent >= 2 || row.distinctUsersCount >= 2,
      );
    }
    return aggregatedRecentSightings;
  }, [aggregatedRecentSightings, recentFilter]);

  const recentSightingsRef = useRef<HTMLElement>(null);

  const mapCorridorId = useMemo(
    () =>
      plannerContext.toPlace?.corridor_id ||
      plannerContext.toPlace?.id ||
      activeCorridor,
    [plannerContext.toPlace, activeCorridor],
  );

  const mapCorridorName = useMemo(() => {
    if (!mapCorridorId) return "Route";
    return (
      corridors.find((c) => c.id === mapCorridorId)?.name ||
      plannerContext.toPlace?.name ||
      activeCorridorName ||
      "Route"
    );
  }, [
    mapCorridorId,
    corridors,
    plannerContext.toPlace?.name,
    activeCorridorName,
  ]);

  const mapJourneyResults = useMemo((): JourneyResult[] => {
    if (plannerResults.length > 0) return plannerResults;

    const cid = mapCorridorId ?? "";
    const cname = mapCorridorName;
    return filteredLiveNganyas.map((n) => ({
      nganya_id: n.nganya_id || n.id,
      nganya_name: n.nganya_name || n.name || "Unknown",
      corridor_id: n.corridor_id || cid,
      corridor_name: n.corridor_name || n.corridors?.name || cname,
      tags: n.tags ?? null,
      eta_minutes: 5,
      confidence_level: "HIGH",
      source: "LIVE",
      last_seen_at: n.last_ping_at ?? null,
      profile_photo_url: n.profile_photo_url ?? null,
    }));
  }, [filteredLiveNganyas, mapCorridorId, mapCorridorName, plannerResults]);

  const visibleNganyaIds = useMemo(
    () => deriveVisibleNganyaIds(plannerContext, plannerResults),
    [plannerContext, plannerResults],
  );

  const plannerCorridorId = useMemo(
    () => getPlannerCorridorId(plannerContext),
    [plannerContext],
  );

  const plannerStageId = plannerContext.fromStage?.id || null;

  useEffect(() => {
    // Planner route becomes the global active corridor while it's set.
    if (!plannerCorridorId) return;
    onCorridorChange(plannerCorridorId);
  }, [plannerCorridorId, onCorridorChange]);

  const plannerJourneyKey = useMemo(() => {
    if (!plannerCorridorId || !plannerStageId) return null;
    const preferredId =
      plannerContext.preference === "SPECIFIC"
        ? plannerContext.preferredNganya?.id || ""
        : "";
    return `${plannerCorridorId}:${plannerStageId}:${plannerContext.preference}:${preferredId}`;
  }, [
    plannerCorridorId,
    plannerStageId,
    plannerContext.preference,
    plannerContext.preferredNganya?.id,
  ]);

  const plannerJourneyKeyRef = useRef<string | null>(null);
  const plannerJourneySeqRef = useRef(0);
  const loadPlannerJourneyResults = (
    key: string,
    options?: { preserveExisting?: boolean },
  ) => {
    if (!plannerCorridorId || !plannerStageId) {
      setPlannerResults([]);
      return;
    }

    const prevKey = plannerJourneyKeyRef.current;
    plannerJourneyKeyRef.current = key;
    if (
      !options?.preserveExisting &&
      prevKey &&
      prevKey.split(":").slice(0, 2).join(":") !==
        key.split(":").slice(0, 2).join(":")
    ) {
      setPlannerResults([]);
    }

    const seq = ++plannerJourneySeqRef.current;
    const preferredNganyaId =
      plannerContext.preference === "SPECIFIC"
        ? plannerContext.preferredNganya?.id || null
        : null;

    const vibeTags =
      plannerContext.preference === "NEWEST" ? ["NEW_BUILD"] : null;

    searchNganyaJourney({
      corridorId: plannerCorridorId,
      pickupStageId: plannerStageId,
      preferredNganyaId,
      vibeTags,
      maxResults: 24,
    })
      .then((data) => {
        if (plannerJourneySeqRef.current !== seq) return;
        if (plannerJourneyKeyRef.current !== key) return;
        setPlannerResults((data || []) as JourneyResult[]);
      })
      .catch(() => {
        if (plannerJourneySeqRef.current !== seq) return;
        if (plannerJourneyKeyRef.current !== key) return;
        setPlannerResults([]);
      });
  };

  useEffect(() => {
    if (!plannerCorridorId || !plannerStageId) {
      setPlannerResults([]);
      return;
    }

    const key = plannerJourneyKey;
    if (!key) return;

    loadPlannerJourneyResults(key);
  }, [
    plannerCorridorId,
    plannerStageId,
    plannerContext.preference,
    plannerContext.preferredNganya?.id,
    plannerJourneyKey,
  ]);

  useEffect(() => {
    if (!plannerJourneyKey || !plannerCorridorId) return;

    const scheduleRefresh = () => {
      if (plannerRealtimeTimerRef.current) {
        clearTimeout(plannerRealtimeTimerRef.current);
      }
      plannerRealtimeTimerRef.current = setTimeout(() => {
        loadPlannerJourneyResults(plannerJourneyKey, { preserveExisting: true });
      }, 1500);
    };

    const channel = supabase
      .channel(`home_planner_${plannerCorridorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `corridor_id=eq.${plannerCorridorId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sightings",
          filter: `corridor_id=eq.${plannerCorridorId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (plannerRealtimeTimerRef.current) {
        clearTimeout(plannerRealtimeTimerRef.current);
        plannerRealtimeTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [plannerJourneyKey, plannerCorridorId]);

  const plannerRideOptions = useMemo(
    () => sortPlannerRideOptions(plannerResults),
    [plannerResults],
  );

  const watchedRide = useMemo(
    () =>
      watchedRideId
        ? plannerRideOptions.find((option) => option.nganya_id === watchedRideId) ||
          null
        : null,
    [plannerRideOptions, watchedRideId],
  );

  const recommendedRide = useMemo(
    () => watchedRide || plannerRideOptions[0] || null,
    [plannerRideOptions, watchedRide],
  );

  const backupRides = useMemo(
    () =>
      plannerRideOptions.filter(
        (option) => option.nganya_id !== recommendedRide?.nganya_id,
      ),
    [plannerRideOptions, recommendedRide?.nganya_id],
  );

  const plannerAssistStatus = useMemo(
    () => getPlannerAssistStatus(plannerRideOptions, watchedRideId),
    [plannerRideOptions, watchedRideId],
  );

  const plannerRouteSignalType = useMemo(() => {
    if (!plannerTracking) return null;

    const trackedRide = plannerRideOptions.find(
      (option) => option.nganya_id === plannerTracking.nganya_id,
    );
    if (trackedRide) return trackedRide.signalType;

    if (plannerTracking.last_seen_at) {
      return getTrackingSignalState(
        plannerTracking.source,
        plannerTracking.last_seen_at,
      );
    }

    return plannerTracking.source === "LIVE" ? "LIVE" : "ESTIMATED";
  }, [plannerRideOptions, plannerTracking]);

  useEffect(() => {
    if (!watchedRideId) {
      setPlannerRiskPrompt(null);
      return;
    }

    const alternative = backupRides[0] || null;
    const nextPrompt = !watchedRide
      ? {
          key: `${watchedRideId}:missing:${alternative?.nganya_id || "none"}`,
          reason: "missing" as const,
          alternative,
        }
      : watchedRide.catchability.status === "STALE_UNCERTAIN"
        ? {
            key: `${watchedRide.nganya_id}:stale:${alternative?.nganya_id || "none"}`,
            reason: "stale" as const,
            alternative,
          }
        : watchedRide.catchability.status !== "CATCHABLE"
          ? {
              key: `${watchedRide.nganya_id}:risky:${alternative?.nganya_id || "none"}`,
              reason: "risky" as const,
              alternative,
            }
          : null;

    if (!nextPrompt) {
      setPlannerRiskPrompt(null);
      return;
    }

    if (dismissedRiskKey === nextPrompt.key) return;
    setPlannerRiskPrompt(nextPrompt);
  }, [backupRides, dismissedRiskKey, watchedRide, watchedRideId]);

  useEffect(() => {
    if (!rideWatchScrollToken || !plannerJourneyKey) return;
    if (!rideWatchSectionRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      rideWatchSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [plannerJourneyKey, rideWatchScrollToken]);

  const featuredNganya =
    filteredNganyas.find((n) => n.tags?.includes("NEW_BUILD")) ??
    filteredNganyas[0] ??
    nganyas[0];

  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;
    const isLive =
      filteredLiveNganyas.some((ln) => ln.nganya_id === dbNganya.id) ||
      dbNganya.status === "LIVE";

    return {
      id: dbNganya.nganya_id || dbNganya.id,
      slug:
        dbNganya.slug ||
        dbNganya.nganya_slug ||
        toNganyaSlug(dbNganya.nganya_name || dbNganya.name),
      name: dbNganya.nganya_name || dbNganya.name,
      corridorId: dbNganya.corridor_id || dbNganya.nganyas?.corridor_id || null,
      corridorName:
        dbNganya.corridor_name || dbNganya.corridors?.name || "Unknown Route",
      corridor:
        dbNganya.corridor_name || dbNganya.corridors?.name || "Unknown Route",
      vibeTags: dbNganya.vibeTags || dbNganya.tags || [],
      imageUrl: pickPrimaryNganyaImageUrl(dbNganya) ?? "",
      isLive,
      isNewBuild: dbNganya.tags?.includes("NEW_BUILD") || dbNganya.is_new_build,
      isVerified: dbNganya.is_verified,
      followers: dbNganya.follower_count || 0,
      sightingsToday: dbNganya.sighting_count_today || 0,
      lastSeen: dbNganya.last_seen || "Recently",
    };
  };

  const handlePlanRideForNganya = (item: BrowseCardActionItem) => {
    setPlannerContext((current) =>
      applyPlannerSeed(
        current,
        {
          id: item.id,
          name: item.name,
          corridorId: item.corridorId,
          corridorName: item.corridorName,
        },
        { clearStageOnRouteChange: true },
      ),
    );
    setPlannerSeed((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast(
      `Route set to ${item.corridorName}. Pick your pickup stage to plan with ${item.name}.`,
      "info",
    );
  };

  const handleBrowseCardAction = (item: BrowseCardActionItem) => {
    if (item.isLive && canTrackWithPlannerContext(plannerContext, item)) {
      setTrackingNganya(item);
      return;
    }

    handlePlanRideForNganya(item);
  };

  const handlePlannerSearch = (_payload: RideSearchPayload) => {
    // Map is driven by the controlled planner filters; "Find my ride" is a submit action only.
    // We still clear any route overlays when user submits a new search.
    setRideWatchScrollToken((current) => current + 1);
    setPlannerTracking(null);
    setPlannerRiskPrompt(null);
    setDismissedRiskKey(null);
    setPlannerRouteLine(null);
    setPlannerRouteEtaSeconds(null);
    setPlannerRouteDistanceMeters(null);
    plannerRouteAbortRef.current?.abort();
    plannerRouteAbortRef.current = null;
    plannerRouteKeyRef.current = null;
  };

  const handlePlannerChange = (next: PlannerFiltersValue) => {
    setPlannerContext((current) => reconcilePlannerContext(current, next));

    // Any filter change invalidates any currently tracked nganya/route overlay.
    setWatchedRideId(null);
    setPlannerRiskPrompt(null);
    setDismissedRiskKey(null);
    setPlannerTracking(null);
    setPlannerRouteLine(null);
    setPlannerRouteEtaSeconds(null);
    setPlannerRouteDistanceMeters(null);
    plannerRouteAbortRef.current?.abort();
    plannerRouteAbortRef.current = null;
    plannerRouteKeyRef.current = null;
  };

  const handlePlannerClear = () => {
    clearPlannerContext();
    setPlannerSeed((current) => current + 1);
    setWatchedRideId(null);
    setPlannerResults([]);
    setPlannerRiskPrompt(null);
    setDismissedRiskKey(null);
    setPlannerTracking(null);
    setPlannerRouteLine(null);
    setPlannerRouteEtaSeconds(null);
    setPlannerRouteDistanceMeters(null);
    plannerRouteAbortRef.current?.abort();
    plannerRouteAbortRef.current = null;
    plannerRouteKeyRef.current = null;
  };

  const handlePlanRideForRecentRow = (row: AggregatedRecentSightingRow) => {
    setPlannerContext((current) =>
      applyPlannerSeed(
        current,
        {
          id: row.nganyaId,
          name: row.nganyaName,
          corridorId: row.corridorId,
          corridorName: row.corridorName,
        },
        { clearStageOnRouteChange: true },
      ),
    );
    setPlannerSeed((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast(
      `Route set to ${row.corridorName}. Pick your pickup stage to plan with ${row.nganyaName}.`,
      "info",
    );
  };

  const handleRecentRowAction = (row: AggregatedRecentSightingRow) => {
    if (
      row.lastSeenMinutes <= 15 &&
      canTrackWithPlannerContext(plannerContext, row)
    ) {
      setTrackingRow(row);
      return;
    }

    handlePlanRideForRecentRow(row);
  };

  const trackPlannerRideOnMap = async (ride: JourneyResult) => {
    if (!plannerContext.fromStage?.id) return;
    if (!mapCorridorId) return;

    setPlannerTracking(ride);
    setPlannerRouteLoading(true);

    const stageId = plannerContext.fromStage.id;
    const [stagePos, nganyaPos] = await Promise.all([
      fetchStagePosition(stageId),
      fetchNganyaPosition(ride.nganya_id),
    ]);

    if (!stagePos || !nganyaPos) {
      setPlannerRouteLine(null);
      setPlannerRouteEtaSeconds(null);
      setPlannerRouteDistanceMeters(null);
      setPlannerRouteLoading(false);
      return;
    }

    const key = `${ride.nganya_id}:${stageId}:${nganyaPos.lng.toFixed(5)},${nganyaPos.lat.toFixed(5)}:${stagePos.lng.toFixed(5)},${stagePos.lat.toFixed(5)}`;
    if (plannerRouteKeyRef.current === key) {
      setPlannerRouteLoading(false);
      return;
    }
    plannerRouteKeyRef.current = key;

    plannerRouteAbortRef.current?.abort();
    const controller = new AbortController();
    plannerRouteAbortRef.current = controller;

    try {
      const route = await fetchOsrmRoute({
        from: nganyaPos,
        to: stagePos,
        signal: controller.signal,
      });

      if (!Number.isFinite(route.durationSeconds)) {
        throw new Error("OSRM route missing duration");
      }

      setPlannerRouteLine({ coordinates: route.coordinates });
      setPlannerRouteEtaSeconds(route.durationSeconds);
      setPlannerRouteDistanceMeters(
        Number.isFinite(route.distanceMeters) ? route.distanceMeters : null,
      );
    } catch (err) {
      if ((err as any)?.name === "AbortError") return;

      setPlannerRouteLine({
        coordinates: [
          [nganyaPos.lng, nganyaPos.lat],
          [stagePos.lng, stagePos.lat],
        ],
      });
      setPlannerRouteDistanceMeters(null);

      const etaMin = Number.isFinite(ride.eta_minutes)
        ? Math.max(1, Math.round(ride.eta_minutes))
        : null;
      setPlannerRouteEtaSeconds(etaMin !== null ? etaMin * 60 : null);
    } finally {
      setPlannerRouteLoading(false);
    }
  };

  const scrollToPlannerMap = () => {
    window.requestAnimationFrame(() => {
      plannerMapSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const watchPlannerRide = (ride: PlannerRideOption) => {
    const isAlreadyWatched = watchedRideId === ride.nganya_id;
    setWatchedRideId(ride.nganya_id);
    setPlannerRiskPrompt(null);
    setDismissedRiskKey(null);
    scrollToPlannerMap();
    void trackPlannerRideOnMap(ride);
    addToast(
      isAlreadyWatched
        ? `Updated ${ride.nganya_name} on the map.`
        : `Watching ${ride.nganya_name} for your pickup.`,
      "info",
    );
  };

  const switchToPlannerRide = (ride: PlannerRideOption) => {
    setWatchedRideId(ride.nganya_id);
    setPlannerRiskPrompt(null);
    setDismissedRiskKey(null);
    scrollToPlannerMap();
    void trackPlannerRideOnMap(ride);
    addToast(`Switched to ${ride.nganya_name}.`, "success");
  };

  const keepWatchingCurrentRide = () => {
    if (!plannerRiskPrompt) return;
    setDismissedRiskKey(plannerRiskPrompt.key);
    setPlannerRiskPrompt(null);
    addToast("Still watching your current ride.", "info");
  };

  return (
    <div className="page-container py-8 md:py-10 space-y-10 md:space-y-12">
      <section className="space-y-2">
        <p className="text-tag text-[var(--color-accent)]">Nairobi Streets</p>
        <h1 className="text-h1">Plan fast, catch faster</h1>
        <p className="text-body text-[var(--color-text-secondary)] max-w-2xl">
          Choose terminal route, pickup stage, and optionally your nganya.
        </p>
      </section>

      <section
        ref={plannerMapSectionRef}
        className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12 lg:items-stretch"
        style={{ scrollMarginTop: plannerMapScrollMargin }}
      >
        <div className="space-y-3 lg:col-span-4 lg:sticky lg:top-[84px] lg:self-start">
          <WhereToCard
            key={plannerSeed}
            value={plannerContext}
            onChange={handlePlannerChange}
            onSearch={handlePlannerSearch}
            onClear={handlePlannerClear}
          />
        </div>

        <div className="min-h-[320px] lg:col-span-8 lg:min-h-0 lg:self-stretch">
          <div className="h-full rounded-[var(--radius-xl)]">
            <div className="h-full overflow-hidden rounded-[var(--radius-xl)]">
              <LiveCorridorMap
                isActive
                corridorId={mapCorridorId}
                corridorName={mapCorridorName}
                pickupStage={plannerContext.fromStage}
                journeyResults={mapJourneyResults}
                visibleNganyaIds={visibleNganyaIds}
                highlightNganyaId={
                  plannerTracking?.nganya_id ??
                  (plannerContext.preference === "SPECIFIC"
                    ? (plannerContext.preferredNganya?.id ?? null)
                    : null)
                }
                onTrackNganya={(j) => void trackPlannerRideOnMap(j)}
                fillRowHeight
                showCaption={false}
                showNoCorridorOverlay={false}
                flushBottom={!!plannerTracking}
                routeLine={plannerRouteLine}
                routeEtaSeconds={plannerRouteEtaSeconds}
                routeDistanceMeters={plannerRouteDistanceMeters}
                routeSignalType={plannerRouteSignalType}
                isRouting={plannerRouteLoading}
                className="h-full min-h-[320px] lg:min-h-0"
              />
            </div>
          </div>
        </div>
      </section>

      {plannerJourneyKey ? (
        <section
          ref={rideWatchSectionRef}
          className="space-y-4"
          style={{ scrollMarginTop: rideWatchScrollMargin }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-h3">Ride watch</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {plannerAssistStatus === "no_matches"
                  ? "Nothing reliable is lining up for this pickup yet."
                  : watchedRide
                    ? `Watching ${watchedRide.nganya_name} for ${plannerContext.fromStage?.name}.`
                    : "Pick one ride to watch or keep backups ready."}
              </p>
            </div>
            {plannerRideOptions.length > 0 ? (
              <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-xs text-[var(--color-text-tertiary)]">
                {plannerRideOptions.length} match
                {plannerRideOptions.length === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>

          {plannerRiskPrompt ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]/15 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--color-warning)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {plannerRiskPrompt.reason === "missing"
                      ? "Your watched ride dropped out of the live results."
                      : plannerRiskPrompt.reason === "stale"
                        ? "Your watched ride is stale now."
                        : "Your watched ride is getting risky."}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {plannerRiskPrompt.alternative
                      ? `Switch to ${plannerRiskPrompt.alternative.nganya_name} or keep waiting for your current ride.`
                      : "Keep waiting if you want, but you should not rely on this ride alone."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plannerRiskPrompt.alternative ? (
                      <Button
                        size="sm"
                        onClick={() => switchToPlannerRide(plannerRiskPrompt.alternative!)}
                      >
                        Switch to {plannerRiskPrompt.alternative.nganya_name}
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={keepWatchingCurrentRide}
                    >
                      Keep watching
                    </Button>
                    {recommendedRide &&
                    !(followedIds.has(recommendedRide.nganya_id) ||
                      plannerAlertIds.has(recommendedRide.nganya_id)) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void turnOnPlannerAlerts(recommendedRide)}
                      >
                        Turn on alerts
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {recommendedRide ? (
            <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                      {watchedRide ? "Watched ride" : "Best ride now"}
                    </span>
                    <TrackingSignalBadge
                      signalType={recommendedRide.signalType}
                      freshnessSeconds={recommendedRide.freshnessSeconds ?? undefined}
                    />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                      {recommendedRide.nganya_name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {recommendedRide.corridor_name} · ~{recommendedRide.eta_minutes} min to{" "}
                      {plannerContext.fromStage?.name}
                    </p>
                  </div>
                  <CatchabilityBadge
                    status={recommendedRide.catchability.status}
                    label={recommendedRide.catchability.label}
                    subtext={recommendedRide.catchability.subtext}
                  />
                </div>

                <div className="flex flex-col gap-2 md:min-w-[220px]">
                  <Button onClick={() => watchPlannerRide(recommendedRide)}>
                    {watchedRide?.nganya_id === recommendedRide.nganya_id
                      ? "Refresh on map"
                      : "Watch on map"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      followedIds.has(recommendedRide.nganya_id) ||
                      plannerAlertIds.has(recommendedRide.nganya_id)
                        ? addToast(`Alerts already on for ${recommendedRide.nganya_name}.`, "info")
                        : void turnOnPlannerAlerts(recommendedRide)
                    }
                  >
                    <BellRing className="h-4 w-4" />
                    {followedIds.has(recommendedRide.nganya_id) ||
                    plannerAlertIds.has(recommendedRide.nganya_id)
                      ? "Alerts on"
                      : "Follow route alerts"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {backupRides.length > 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    Backup rides
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    Keep one ready in case your watched ride slows down or drops out.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {backupRides.slice(0, 3).map((ride) => (
                  <div
                    key={ride.nganya_id}
                    className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-bg-card)]/50 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {ride.nganya_name}
                        </p>
                        <TrackingSignalBadge
                          signalType={ride.signalType}
                          freshnessSeconds={ride.freshnessSeconds ?? undefined}
                        />
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        ~{ride.eta_minutes} min on {ride.corridor_name}
                      </p>
                      <CatchabilityBadge
                        status={ride.catchability.status}
                        label={ride.catchability.label}
                        subtext={ride.catchability.subtext}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => switchToPlannerRide(ride)}
                      >
                        Watch on map
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {plannerAssistStatus === "no_matches" ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-text-secondary)]">
              <p>No strong ride matches yet for this stage.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    recentSightingsRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  Check recent sightings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.navigate({
                      to: "/discover",
                      search: {
                        corridor: plannerCorridorId || undefined,
                      } as any,
                    })
                  }
                >
                  Find similar rides
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LiveBadge />
            <span className="text-h4 text-[var(--color-text-primary)]">
              {filteredLiveNganyas.length} on the road
            </span>
          </div>
          <button className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {filteredLiveNganyas.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scroll-hidden pb-2 -mx-5 px-5 md:-mx-8 md:px-8">
            {filteredLiveNganyas.map((n) => {
              const cardData = mapSupabaseToCardProps(n);
              if (!cardData) return null;
              return (
                <div
                  key={cardData.id}
                  className="shrink-0 w-[260px] md:w-[300px]"
                >
                  <Card
                    nganya={cardData as any}
                    variant="standard"
                    isFollowing={followedIds.has(cardData.id)}
                    onFollow={toggleFollow}
                    onCardClick={() => handleBrowseCardAction(cardData)}
                    primaryAction={{
                      label:
                        cardData.isLive &&
                        canTrackWithPlannerContext(plannerContext, cardData)
                          ? "Track"
                          : "Plan ride",
                      onClick: () => handleBrowseCardAction(cardData),
                    }}
                    secondaryAction={{
                      label: followedIds.has(cardData.id)
                        ? "Following"
                        : "Follow",
                      onClick: () => void toggleFollow(cardData.id),
                      variant: "secondary",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-text-secondary)]">
            No live sessions on this route. Check recently spotted below for
            actionable alternatives.
          </div>
        )}
      </section> */}

      <section ref={recentSightingsRef}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-h3">Recently Spotted</h2>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {recentSummaryCount > 0
                ? `${recentSummaryCount} nganyas spotted in the last 15 min`
                : "Fresh route signals, grouped for quick decisions"}
            </p>
          </div>
          <button
            onClick={() =>
              router.navigate({
                to: "/",
                search: (current: any) => ({
                  ...current,
                  recent: showAllRecent ? undefined : "all",
                }),
              })
            }
            className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          >
            {showAllRecent ? "Show less" : "See all"}{" "}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Chip
            label="All"
            variant="route"
            isActive={recentFilter === "ALL"}
            onClick={() => setRecentFilter("ALL")}
          />
          {activeCorridor ? (
            <Chip
              label="On your route"
              variant="route"
              isActive={recentFilter === "ON_ROUTE"}
              onClick={() => setRecentFilter("ON_ROUTE")}
            />
          ) : null}
          <Chip
            label="High activity"
            variant="route"
            isActive={recentFilter === "HIGH_ACTIVITY"}
            onClick={() => setRecentFilter("HIGH_ACTIVITY")}
          />
        </div>

        {filteredAggregatedRecentSightings.length > 0 ? (
          <div className="space-y-2">
            {filteredAggregatedRecentSightings
              .slice(
                0,
                showAllRecent ? filteredAggregatedRecentSightings.length : 5,
              )
              .map((row) => {
                const recencyLabel = getRecencyLabel(
                  row.lastSeenMinutes,
                  row.lastSeenAt,
                );
                const isFresh = row.lastSeenMinutes <= 15;
                const canTrackRow = canTrackWithPlannerContext(
                  plannerContext,
                  row,
                );
                const actionLabel =
                  isFresh && canTrackRow ? "Track" : "Plan ride";
                const primaryContext = row.directionLabel
                  ? `${row.stageName || row.corridorName} ${row.directionLabel}`
                  : row.stageName || row.corridorName;
                const secondaryContext = row.onRoute
                  ? `${row.corridorName}`
                  : row.corridorName;
                const toneClasses =
                  row.statusTone === "hot"
                    ? "bg-[var(--color-accent)]"
                    : row.statusTone === "warm"
                      ? "bg-[var(--color-warning)]"
                      : "bg-[var(--color-text-tertiary)]";

                return (
                  <div
                    key={row.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRecentRowAction(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleRecentRowAction(row);
                      }
                    }}
                    className="grid w-full grid-cols-[12px_minmax(0,1.2fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-left transition-colors hover:border-[var(--glass-border-hover)]"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${toneClasses}`}
                    />

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {row.nganyaName}
                      </div>
                      <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                        {primaryContext}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-xs text-[var(--color-text-secondary)]">
                        {secondaryContext}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <span>{row.signalLabel}</span>
                        {row.sightingsCountRecent > 1 ? (
                          <span>• {row.sightingsCountRecent} sightings</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-self-end">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs text-[var(--color-text-tertiary)]">
                          <Clock className="h-3 w-3" />
                          {recencyLabel}
                        </div>
                      </div>
                      <Button
                        variant={
                          isFresh && canTrackRow ? "primary" : "secondary"
                        }
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRecentRowAction(row);
                        }}
                      >
                        {actionLabel}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-text-secondary)]">
            <p className="mt-1">No recent sightings</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => router.navigate({ to: "/spot" })}
            >
              Be the first to spot
            </Button>
          </div>
        )}
      </section>

      {trackingRow && plannerContext.toPlace && plannerContext.fromStage ? (
        <SearchResultsOverlayV2
          isOpen
          onClose={() => setTrackingRow(null)}
          fromStage={plannerContext.fromStage}
          toPlace={plannerContext.toPlace}
          preference="SPECIFIC"
          preferredNganya={{
            id: trackingRow.nganyaId,
            name: trackingRow.nganyaName,
          }}
        />
      ) : null}

      {trackingNganya && plannerContext.toPlace && plannerContext.fromStage ? (
        <SearchResultsOverlayV2
          isOpen
          onClose={() => setTrackingNganya(null)}
          fromStage={plannerContext.fromStage}
          toPlace={plannerContext.toPlace}
          preference="SPECIFIC"
          preferredNganya={{
            id: trackingNganya.id,
            name: trackingNganya.name,
          }}
        />
      ) : null}

      {featuredNganya && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--color-green)]" />
            <span className="text-tag text-[var(--color-green)]">
              Featured on this route
            </span>
          </div>
          <div className="hidden md:block">
            <Card
              nganya={mapSupabaseToCardProps(featuredNganya) as any}
              variant="feature"
              isFollowing={followedIds.has(featuredNganya.id)}
              onFollow={toggleFollow}
            />
          </div>
          <div className="md:hidden">
            <Card
              nganya={mapSupabaseToCardProps(featuredNganya) as any}
              variant="standard"
              isFollowing={followedIds.has(featuredNganya.id)}
              onFollow={toggleFollow}
            />
          </div>
        </section>
      )}

      <section>
        {(() => {
          // Nganyas on the active corridor, sorted newest-first, capped at 3.
          // Falls back to all nganyas when no corridor is selected.
          const routeNganyas = [...nganyas]
            .filter((n) => !mapCorridorId || n.corridor_id === mapCorridorId)
            .sort(
              (a, b) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime(),
            )
            .slice(0, 3);

          if (routeNganyas.length === 0) return null;

          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h3">More on this route</h2>
                <a
                  href={
                    mapCorridorId
                      ? `/discover?corridorId=${encodeURIComponent(mapCorridorId)}`
                      : "/discover"
                  }
                  className="text-xs font-semibold text-[var(--color-accent)] hover:underline shrink-0"
                >
                  View all
                </a>
              </div>

              <div className="grid-cards">
                {routeNganyas.map((n) => {
                  const cardData = mapSupabaseToCardProps(n);
                  if (!cardData) return null;
                  return (
                    <Card
                      key={cardData.id}
                      nganya={cardData as any}
                      variant="standard"
                      isFollowing={followedIds.has(cardData.id)}
                      onFollow={toggleFollow}
                      onCardClick={() => handleBrowseCardAction(cardData)}
                      primaryAction={{
                        label:
                          cardData.isLive &&
                          canTrackWithPlannerContext(plannerContext, cardData)
                            ? "Track"
                            : "Plan ride",
                        onClick: () => handleBrowseCardAction(cardData),
                      }}
                      secondaryAction={{
                        label: followedIds.has(cardData.id)
                          ? "Following"
                          : "Follow",
                        onClick: () => void toggleFollow(cardData.id),
                        variant: "secondary",
                      }}
                    />
                  );
                })}
              </div>
            </>
          );
        })()}
      </section>
    </div>
  );
}

export function HomeScreenSkeleton() {
  return (
    <div className="page-container py-8 md:py-10 space-y-10 md:space-y-12">
      <section className="space-y-2">
        <Skeleton className="h-4 w-28" variant="text" />
        <Skeleton className="h-10 w-72" variant="text" />
        <Skeleton className="h-4 w-[32rem] max-w-full" variant="text" />
      </section>

      <section className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-4">
          <Skeleton className="h-[320px] rounded-[var(--radius-xl)] md:h-[360px] lg:h-[420px]" />
        </div>
        <div className="lg:col-span-8">
          <Skeleton className="h-[320px] rounded-[var(--radius-xl)] md:h-[360px] lg:h-[420px]" />
        </div>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-7 w-40" variant="text" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-[68px] rounded-[var(--radius-md)]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
