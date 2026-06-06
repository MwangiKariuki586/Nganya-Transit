import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import type {
  PlannerFiltersValue,
  RideSearchPayload,
} from "@/components/features/WhereToCard";
import { getTrackingSignalState } from "@/lib/tracking-signal";
import type { JourneyResult } from "@/lib/types/journey";
import { useCorridorRealtimeRefresh } from "@/modules/fan/hooks/useCorridorRealtimeRefresh";
import { usePlannerFilters } from "@/modules/fan/hooks/usePlannerFilters";
import type {
  FanCorridorRecord,
  FanLiveNganyaRecord,
} from "@/modules/fan/lib/fan-data";
import { deriveVisibleNganyaIds } from "@/modules/fan/services/derive-visible-nganya-ids";
import {
  applyPlannerSeed,
  canTrackWithPlannerContext,
  getPlannerCorridorId,
  reconcilePlannerContext,
} from "@/modules/fan/services/planner-storage";
import { buildPlannerSeedToastMessage } from "@/modules/fan/services/planner-handoff";
import {
  getPlannerAssistStatus,
  sortPlannerRideOptions,
  type PlannerRideOption,
} from "@/modules/fan/services/planner-assist";
import {
  buildPlannerJourneyKey,
  buildPlannerRouteCacheKey,
  getPlannerRiskPrompt,
  shouldResetPlannerResults,
} from "./home-planner-domain";
import type {
  AggregatedRecentSightingRow,
  BrowseCardActionItem,
  HomePlannerSeedTarget,
} from "./home-types";

interface UseHomePlannerOptions {
  activeCorridor: string | null;
  corridors: FanCorridorRecord[];
  isAuthenticated: boolean;
  liveNganyas: FanLiveNganyaRecord[];
  onCorridorChange: (corridorId: string | null) => void;
}

let discoverQueriesPromise:
  | Promise<typeof import("@/lib/queries/discover")>
  | null = null;
let trackingQueriesPromise:
  | Promise<typeof import("@/lib/queries/tracking")>
  | null = null;
let osrmPromise: Promise<typeof import("@/lib/osrm")> | null = null;
let supabasePromise: Promise<typeof import("@/lib/supabase")> | null = null;

function loadDiscoverQueries() {
  discoverQueriesPromise ??= import("@/lib/queries/discover");
  return discoverQueriesPromise;
}

function loadTrackingQueries() {
  trackingQueriesPromise ??= import("@/lib/queries/tracking");
  return trackingQueriesPromise;
}

function loadOsrmModule() {
  osrmPromise ??= import("@/lib/osrm");
  return osrmPromise;
}

function loadSupabaseModule() {
  supabasePromise ??= import("@/lib/supabase");
  return supabasePromise;
}

export function useHomePlanner({
  activeCorridor,
  corridors,
  isAuthenticated,
  liveNganyas,
  onCorridorChange,
}: UseHomePlannerOptions) {
  const navigate = useNavigate();
  const { addToast } = useToast();
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
  const [plannerRouteLoading, setPlannerRouteLoading] = useState(false);
  const [trackingRow, setTrackingRow] =
    useState<AggregatedRecentSightingRow | null>(null);
  const [trackingNganya, setTrackingNganya] =
    useState<BrowseCardActionItem | null>(null);
  const [plannerSeed, setPlannerSeed] = useState(0);
  const [rideWatchScrollToken, setRideWatchScrollToken] = useState(0);
  const [watchedRideId, setWatchedRideId] = useState<string | null>(null);
  const [dismissedRiskKey, setDismissedRiskKey] = useState<string | null>(null);

  const plannerRouteAbortRef = useRef<AbortController | null>(null);
  const plannerRouteKeyRef = useRef<string | null>(null);
  const plannerMapSectionRef = useRef<HTMLElement>(null);
  const rideWatchSectionRef = useRef<HTMLElement>(null);
  const plannerJourneyKeyRef = useRef<string | null>(null);
  const plannerJourneySeqRef = useRef(0);
  const plannerMapScrollMargin = "calc(var(--top-nav-height) + 16px)";
  const rideWatchScrollMargin = "calc(var(--top-nav-height) + 16px)";

  const filteredLiveNganyas = useMemo(
    () =>
      activeCorridor
        ? liveNganyas.filter((n) => n.corridor_id === activeCorridor)
        : liveNganyas,
    [activeCorridor, liveNganyas],
  );

  const liveSeatsByNganyaId = useMemo(
    () =>
      new Map<string, number>(
        filteredLiveNganyas
          .map((nganya) => {
            const nganyaId = nganya.nganya_id || nganya.id;
            const seatsLeft = nganya.seats_left;
            return nganyaId && Number.isFinite(seatsLeft)
              ? [nganyaId, Number(seatsLeft)]
              : null;
          })
          .filter((entry): entry is [string, number] => Boolean(entry)),
      ),
    [filteredLiveNganyas],
  );

  const mapCorridorId = useMemo(
    () =>
      plannerContext.toPlace?.corridor_id ||
      plannerContext.toPlace?.id ||
      activeCorridor,
    [plannerContext.toPlace, activeCorridor],
  );

  const activeCorridorName = useMemo(
    () => corridors.find((c) => c.id === activeCorridor)?.name || null,
    [corridors, activeCorridor],
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
    activeCorridorName,
    corridors,
    mapCorridorId,
    plannerContext.toPlace?.name,
  ]);

  const plannerResultsWithLiveSeats = useMemo(
    () =>
      plannerResults.map((result) => ({
        ...result,
        seats_left:
          Number.isFinite(result.seats_left)
            ? result.seats_left
            : liveSeatsByNganyaId.get(result.nganya_id) ?? null,
      })),
    [liveSeatsByNganyaId, plannerResults],
  );

  const mapJourneyResults = useMemo((): JourneyResult[] => {
    if (plannerResultsWithLiveSeats.length > 0) return plannerResultsWithLiveSeats;

    const corridorId = mapCorridorId ?? "";
    const corridorName = mapCorridorName;
    return filteredLiveNganyas.map((n) => ({
      nganya_id: n.nganya_id || n.id,
      nganya_name: n.nganya_name || n.name || "Unknown",
      corridor_id: n.corridor_id || corridorId,
      corridor_name: n.corridor_name || n.corridors?.name || corridorName,
      tags: n.tags ?? null,
      eta_minutes: 5,
      seats_left: Number.isFinite(n.seats_left) ? Number(n.seats_left) : null,
      confidence_level: "HIGH",
      source: "LIVE",
      last_seen_at: n.last_ping_at ?? null,
      profile_photo_url: n.profile_photo_url ?? null,
    }));
  }, [
    filteredLiveNganyas,
    mapCorridorId,
    mapCorridorName,
    plannerResultsWithLiveSeats,
  ]);

  const visibleNganyaIds = useMemo(
    () => deriveVisibleNganyaIds(plannerContext, plannerResultsWithLiveSeats),
    [plannerContext, plannerResultsWithLiveSeats],
  );

  const plannerCorridorId = useMemo(
    () => getPlannerCorridorId(plannerContext),
    [plannerContext],
  );

  const plannerStageId = plannerContext.fromStage?.id || null;

  useEffect(() => {
    if (!plannerCorridorId) return;
    onCorridorChange(plannerCorridorId);
  }, [plannerCorridorId, onCorridorChange]);

  const plannerJourneyKey = useMemo(
    () =>
      buildPlannerJourneyKey({
        plannerCorridorId,
        plannerStageId,
        preference: plannerContext.preference,
        preferredNganyaId: plannerContext.preferredNganya?.id,
      }),
    [
      plannerContext.preference,
      plannerContext.preferredNganya?.id,
      plannerCorridorId,
      plannerStageId,
    ],
  );

  const resetTrackedRouteState = () => {
    setPlannerTracking(null);
    setPlannerRouteLine(null);
    setPlannerRouteEtaSeconds(null);
    setPlannerRouteDistanceMeters(null);
    setPlannerRouteLoading(false);
    plannerRouteAbortRef.current?.abort();
    plannerRouteAbortRef.current = null;
    plannerRouteKeyRef.current = null;
  };

  const resetWatchState = () => {
    setWatchedRideId(null);
    setDismissedRiskKey(null);
    resetTrackedRouteState();
  };

  const loadPlannerJourneyResults = (
    key: string,
    options?: { preserveExisting?: boolean },
  ) => {
    if (!plannerCorridorId || !plannerStageId) {
      setPlannerResults([]);
      return;
    }

    const previousKey = plannerJourneyKeyRef.current;
    plannerJourneyKeyRef.current = key;
    if (
      !options?.preserveExisting &&
      shouldResetPlannerResults(previousKey, key)
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

    loadDiscoverQueries()
      .then(({ searchNganyaJourney }) =>
        searchNganyaJourney({
          corridorId: plannerCorridorId,
          pickupStageId: plannerStageId,
          preferredNganyaId,
          vibeTags,
          maxResults: 24,
        }),
      )
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

    if (!plannerJourneyKey) return;
    loadPlannerJourneyResults(plannerJourneyKey);
  }, [
    plannerContext.preference,
    plannerContext.preferredNganya?.id,
    plannerCorridorId,
    plannerJourneyKey,
    plannerStageId,
  ]);

  useCorridorRealtimeRefresh({
    enabled: Boolean(
      plannerJourneyKey &&
        plannerCorridorId &&
        plannerContext.fromStage &&
        plannerContext.toPlace,
    ),
    corridorIds: plannerCorridorId ? [plannerCorridorId] : [],
    channelPrefix: "home_planner",
    debounceMs: 1500,
    onRefresh: () => {
      if (!plannerJourneyKey) return;
      loadPlannerJourneyResults(plannerJourneyKey, { preserveExisting: true });
    },
    loadClient: loadSupabaseModule,
  });

  const plannerRideOptions = useMemo(
    () => sortPlannerRideOptions(plannerResultsWithLiveSeats),
    [plannerResultsWithLiveSeats],
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

  const plannerRiskPrompt = useMemo(
    () =>
      getPlannerRiskPrompt({
        watchedRideId,
        watchedRide,
        backupRides,
        dismissedRiskKey,
      }),
    [backupRides, dismissedRiskKey, watchedRide, watchedRideId],
  );

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

  const handlePlanRideForItem = (target: HomePlannerSeedTarget) => {
    setPlannerContext((current) =>
      applyPlannerSeed(
        current,
        {
          id: target.id,
          name: target.name,
          corridorId: target.corridorId,
          corridorName: target.corridorName,
        },
        { clearStageOnRouteChange: true },
      ),
    );
    setPlannerSeed((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    addToast(buildPlannerSeedToastMessage(target), "info");
  };

  const requireAuthForTracking = () => {
    if (isAuthenticated) return true;
    addToast("Sign in to track live rides.", "info");
    navigate({ to: "/signin", search: { returnTo: "/" } });
    return false;
  };

  const handleBrowseCardAction = (item: BrowseCardActionItem) => {
    if (item.isLive && canTrackWithPlannerContext(plannerContext, item)) {
      if (!requireAuthForTracking()) return;
      setTrackingNganya(item);
      return;
    }

    handlePlanRideForItem({
      id: item.id,
      name: item.name,
      corridorId: item.corridorId,
      corridorName: item.corridorName,
    });
  };

  const handleRecentRowAction = (row: AggregatedRecentSightingRow) => {
    if (
      row.lastSeenMinutes <= 15 &&
      canTrackWithPlannerContext(plannerContext, row)
    ) {
      if (!requireAuthForTracking()) return;
      setTrackingRow(row);
      return;
    }

    handlePlanRideForItem({
      id: row.nganyaId,
      name: row.nganyaName,
      corridorId: row.corridorId,
      corridorName: row.corridorName,
    });
  };

  const handlePlannerSearch = (_payload: RideSearchPayload) => {
    setRideWatchScrollToken((current) => current + 1);
    setDismissedRiskKey((current) => plannerRiskPrompt?.key || current);
    resetTrackedRouteState();
  };

  const handlePlannerChange = (next: PlannerFiltersValue) => {
    setPlannerContext((current) => reconcilePlannerContext(current, next));
    resetWatchState();
  };

  const handlePlannerClear = () => {
    clearPlannerContext();
    setPlannerSeed((current) => current + 1);
    setPlannerResults([]);
    resetWatchState();
  };

  const trackPlannerRideOnMap = async (ride: JourneyResult) => {
    if (!isAuthenticated) {
      requireAuthForTracking();
      return;
    }
    if (!plannerContext.fromStage?.id) return;
    if (!mapCorridorId) return;

    setPlannerTracking(ride);
    setPlannerRouteLoading(true);

    const stageId = plannerContext.fromStage.id;
    let stagePos: { lat: number; lng: number } | null = null;
    let nganyaPos: { lat: number; lng: number } | null = null;
    try {
      const [{ fetchNganyaPosition, fetchStagePosition }, { fetchOsrmRoute }] =
        await Promise.all([loadTrackingQueries(), loadOsrmModule()]);

      [stagePos, nganyaPos] = await Promise.all([
        fetchStagePosition(stageId),
        fetchNganyaPosition(ride.nganya_id),
      ]);

      if (!stagePos || !nganyaPos) {
        setPlannerRouteLine(null);
        setPlannerRouteEtaSeconds(null);
        setPlannerRouteDistanceMeters(null);
        return;
      }

      const key = buildPlannerRouteCacheKey({
        rideId: ride.nganya_id,
        stageId,
        nganyaPos,
        stagePos,
      });
      if (plannerRouteKeyRef.current === key) {
        return;
      }
      plannerRouteKeyRef.current = key;

      plannerRouteAbortRef.current?.abort();
      const controller = new AbortController();
      plannerRouteAbortRef.current = controller;

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
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (!stagePos || !nganyaPos) {
        setPlannerRouteLine(null);
        setPlannerRouteEtaSeconds(null);
        setPlannerRouteDistanceMeters(null);
        return;
      }

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
    if (!requireAuthForTracking()) return;
    const isAlreadyWatched = watchedRideId === ride.nganya_id;
    setWatchedRideId(ride.nganya_id);
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
    if (!requireAuthForTracking()) return;
    setWatchedRideId(ride.nganya_id);
    setDismissedRiskKey(null);
    scrollToPlannerMap();
    void trackPlannerRideOnMap(ride);
    addToast(`Switched to ${ride.nganya_name}.`, "success");
  };

  const keepWatchingCurrentRide = () => {
    if (!plannerRiskPrompt) return;
    setDismissedRiskKey(plannerRiskPrompt.key);
    addToast("Still watching your current ride.", "info");
  };

  return {
    activeCorridorName,
    filteredLiveNganyas,
    mapCorridorId,
    mapCorridorName,
    mapJourneyResults,
    plannerAssistStatus,
    plannerContext,
    plannerJourneyKey,
    plannerMapScrollMargin,
    plannerMapSectionRef,
    plannerRideOptions,
    plannerRiskPrompt,
    plannerRouteDistanceMeters,
    plannerRouteEtaSeconds,
    plannerRouteLine,
    plannerRouteLoading,
    plannerRouteSignalType,
    plannerSeed,
    plannerTracking,
    recommendedRide,
    rideWatchScrollMargin,
    rideWatchSectionRef,
    trackingNganya,
    trackingRow,
    visibleNganyaIds,
    watchedRide,
    backupRides,
    handleBrowseCardAction,
    handlePlannerChange,
    handlePlannerClear,
    handlePlannerSearch,
    handleRecentRowAction,
    keepWatchingCurrentRide,
    setTrackingNganya,
    setTrackingRow,
    switchToPlannerRide,
    trackPlannerRideOnMap,
    watchPlannerRide,
  };
}
