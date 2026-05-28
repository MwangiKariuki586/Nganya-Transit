import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import {
  followNganya,
  unfollowNganya,
  updateFollowAlerts,
} from "@/lib/queries/follows";
import { useCorridorRealtimeRefresh } from "@/modules/fan/hooks/useCorridorRealtimeRefresh";
import type {
  FanLiveNganyaRecord,
  FanRecentSightingRecord,
} from "@/modules/fan/lib/fan-data";
import { supabase } from "@/lib/supabase";
import {
  canTrackWithPlannerContext,
} from "@/modules/fan/services/planner-storage";
import {
  buildPlannerStageToastMessage,
  persistPlannerHandoff,
} from "@/modules/fan/services/planner-handoff";
import {
  applyFollowOverride,
  clearMutatingId,
  restoreFollowOverride,
} from "@/modules/fan/services/follow-optimistic";
import type { DashboardItem, PlannerContext } from "./following-types";
import {
  buildDashboardItem,
  buildRecommendation,
  readPlannerContext,
  sortDashboardItems,
} from "./following-domain";
import type { FollowingRouteData } from "@/modules/fan/services/route-data";

export function useFollowingDashboard(data: FollowingRouteData) {
  const navigate = useNavigate();
  const router = useRouter();
  const { showErrorToast, addToast } = useToast();
  const { isAuthenticated, followedNganyas, nganyas, liveNganyas, recentSightings } = data;

  const [plannerContext, setPlannerContext] = useState<PlannerContext>({
    toPlace: null, fromStage: null, preferredNganya: null, preference: "ANY",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutatingIds, setMutatingIds] = useState<Record<string, boolean>>({});
  const [followOverrides, setFollowOverrides] = useState<Record<string, { isFollowing?: boolean; notifyLive?: boolean }>>({});
  const [trackingItem, setTrackingItem] = useState<DashboardItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => { setPlannerContext(readPlannerContext()); }, []);
  useEffect(() => { return () => { if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current); }; }, []);

  const liveById = useMemo(
    () =>
      new Map<string, FanLiveNganyaRecord>(
        (liveNganyas || [])
          .filter((item): item is FanLiveNganyaRecord & { nganya_id: string } => Boolean(item.nganya_id))
          .map((item) => [item.nganya_id, item]),
      ),
    [liveNganyas],
  );

  const recentById = useMemo(() => {
    const m = new Map<string, FanRecentSightingRecord>();
    for (const s of recentSightings || []) {
      if (s.nganya_id && !m.has(s.nganya_id)) m.set(s.nganya_id, s);
    }
    return m;
  }, [recentSightings]);

  const followedItems = useMemo(() => {
    const enriched = followedNganyas
      .map((follow) => {
        const override = followOverrides[follow.nganya_id] || {};
        if (override.isFollowing === false) return null;
        return buildDashboardItem(follow.nganyas, {
          liveById, recentById, plannerContext,
          followMeta: { notifyLive: override.notifyLive ?? follow.notify_live, createdAt: follow.created_at },
        });
      })
      .filter(Boolean) as DashboardItem[];
    return sortDashboardItems(enriched);
  }, [followedNganyas, followOverrides, liveById, recentById, plannerContext]);

  const followedIds = useMemo(() => new Set(followedItems.map((i) => i.id)), [followedItems]);

  const followedCorridorCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of followedItems) { if (i.corridorId) m.set(i.corridorId, (m.get(i.corridorId) || 0) + 1); }
    return m;
  }, [followedItems]);

  const recommendations = useMemo(() => {
    const items = nganyas
      .filter((n) => {
        const id = n.id || n.nganya_id;
        return Boolean(id) && !followedIds.has(id) && followOverrides[id]?.isFollowing !== true;
      })
      .map((c) => buildRecommendation(c, { liveById, recentById, plannerContext, followedItems, followedCorridorCounts }))
      .filter(Boolean) as DashboardItem[];
    return sortDashboardItems(items).slice(0, 4);
  }, [nganyas, followedIds, followOverrides, liveById, recentById, plannerContext, followedItems, followedCorridorCounts]);

  const activeLiveItems = useMemo(() => {
    const active = followedItems.filter((i) => i.status !== "OFFLINE");
    const routeMatches = active.filter((i) => i.matchesPlannerRoute || i.matchesPreferredNganya);
    return (routeMatches.length > 0 ? routeMatches : active).slice(0, 4);
  }, [followedItems]);

  const filterChips = useMemo(() => {
    const corridorChips = Array.from(followedCorridorCounts.entries()).slice(0, 2)
      .map(([cId]) => ({ id: `corridor:${cId}`, label: followedItems.find((i) => i.corridorId === cId)?.corridorName || "Corridor" }));
    const topTags = Array.from(
      followedItems.reduce<Map<string, number>>((m, i) => { for (const t of i.tags) m.set(t, (m.get(t) || 0) + 1); return m; }, new Map()),
    ).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => ({ id: `tag:${t}`, label: t }));
    return [{ id: "all", label: "All" }, { id: "live", label: "Live now" }, { id: "recent", label: "Recently seen" }, ...corridorChips, ...topTags];
  }, [followedCorridorCounts, followedItems]);

  useEffect(() => { if (!filterChips.some((c) => c.id === activeFilter)) setActiveFilter("all"); }, [filterChips, activeFilter]);

  const filteredFollowedItems = useMemo(() => {
    if (activeFilter === "all") return followedItems;
    if (activeFilter === "live") return followedItems.filter((i) => i.status === "LIVE_NOW");
    if (activeFilter === "recent") return followedItems.filter((i) => i.status === "RECENTLY_SEEN");
    if (activeFilter.startsWith("corridor:")) return followedItems.filter((i) => i.corridorId === activeFilter.replace("corridor:", ""));
    if (activeFilter.startsWith("tag:")) { const tag = activeFilter.replace("tag:", ""); return followedItems.filter((i) => i.tags.includes(tag)); }
    return followedItems;
  }, [activeFilter, followedItems]);

  const liveCount = followedItems.filter((i) => i.status === "LIVE_NOW").length;
  const recentCount = followedItems.filter((i) => i.status === "RECENTLY_SEEN").length;
  const plannerRouteLabel = plannerContext.toPlace?.name || null;

  const queueRefresh = useCallback(async () => {
    if (typeof window === "undefined") { await router.invalidate(); return; }
    if (refreshTimerRef.current) return;
    setIsRefreshing(true);
    refreshTimerRef.current = window.setTimeout(async () => {
      try { await router.invalidate(); } finally { setIsRefreshing(false); refreshTimerRef.current = null; }
    }, 250);
  }, [router]);

  const followedCorridorIds = useMemo(
    () =>
      Array.from(
        new Set(followedItems.map((item) => item.corridorId).filter(Boolean)),
      ) as string[],
    [followedItems],
  );

  useCorridorRealtimeRefresh({
    enabled: isAuthenticated && followedCorridorIds.length > 0,
    corridorIds: followedCorridorIds,
    channelPrefix: "following_dashboard",
    debounceMs: 250,
    onRefresh: queueRefresh,
    loadClient: () => Promise.resolve({ supabase }),
  });

  const runMutation = async (id: string, task: () => Promise<void>) => {
    setMutatingIds((c) => ({ ...c, [id]: true }));
    try { await task(); await queueRefresh(); } catch (error) { showErrorToast(error, "Failed to update follow."); throw error; } finally {
      setMutatingIds((c) => clearMutatingId(c, id));
    }
  };

  const handleToggleFollow = async (item: DashboardItem, isFollowing: boolean) => {
    const prev = followOverrides[item.id];
    setFollowOverrides((c) =>
      applyFollowOverride(c, item.id, { isFollowing: !isFollowing }),
    );
    try { await runMutation(item.id, async () => { if (isFollowing) await unfollowNganya(item.id); else await followNganya(item.id); }); } catch {
      setFollowOverrides((c) => restoreFollowOverride(c, item.id, prev));
    }
  };

  const handleToggleAlerts = async (item: DashboardItem, nextNotifyLive: boolean) => {
    const prev = followOverrides[item.id];
    setFollowOverrides((c) =>
      applyFollowOverride(c, item.id, { notifyLive: nextNotifyLive }),
    );
    try { await runMutation(item.id, async () => { await updateFollowAlerts(item.id, nextNotifyLive); }); } catch {
      setFollowOverrides((c) => restoreFollowOverride(c, item.id, prev));
    }
  };

  const planRideFor = (item?: DashboardItem | null, options?: { useRecentStage?: boolean }) => {
    const search = persistPlannerHandoff(plannerContext, {
      ...(item || undefined),
      stageId: options?.useRecentStage && item?.recentSighting?.stage_id ? item.recentSighting.stage_id : undefined,
      stageName: options?.useRecentStage && item?.stageLabel ? item.stageLabel : undefined,
    });
    if (options?.useRecentStage && item?.stageLabel) {
      addToast(
        buildPlannerStageToastMessage({
          corridorName: item.corridorName,
          stageName: item.stageLabel,
          name: item.name,
        }),
        "info",
      );
    }
    navigate({ to: "/", search: search as never });
  };

  const canTrackItem = (item: DashboardItem) => canTrackWithPlannerContext(plannerContext, item);

  const handlePrimaryAction = (item: DashboardItem) => {
    if ((item.status === "LIVE_NOW" || item.status === "RECENTLY_SEEN") && canTrackItem(item)) { setTrackingItem(item); return; }
    if (item.status === "OFFLINE" && !item.notifyLive) { void handleToggleAlerts(item, true); return; }
    if (item.status === "RECENTLY_SEEN") { navigate({ to: "/nganya/$slug", params: { slug: item.slug } }); return; }
    planRideFor(item);
  };

  const handleSecondaryAction = (item: DashboardItem) => {
    if (item.status === "OFFLINE" && item.notifyLive) { navigate({ to: "/discover", search: { corridor: item.corridorId || undefined, vibe: item.tags[0] || undefined } as never }); return; }
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

  const headerTarget = followedItems.find((i) => i.matchesPlannerRoute || i.matchesPreferredNganya) || followedItems[0] || null;

  const emptyRecommendations = useMemo(() => {
    if (followedItems.length > 0) return [];
    return sortDashboardItems(
      (nganyas || []).map((c) => buildDashboardItem(c, { liveById, recentById, plannerContext })).filter(Boolean) as DashboardItem[],
    ).slice(0, 4);
  }, [followedItems.length, nganyas, liveById, recentById, plannerContext]);

  return {
    plannerContext, isRefreshing, mutatingIds, trackingItem, setTrackingItem,
    activeFilter, setActiveFilter,
    followedItems, recommendations, activeLiveItems, filterChips, filteredFollowedItems,
    liveCount, recentCount, plannerRouteLabel,
    handleToggleFollow, handleToggleAlerts, handlePrimaryAction, handleSecondaryAction,
    getPrimaryLabel, getSecondaryLabel, headerTarget, emptyRecommendations, planRideFor, navigate,
  };
}
