import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import {
  followNganya,
  unfollowNganya,
  updateFollowAlerts,
} from "@/lib/queries/follows";
import { supabase } from "@/lib/supabase";
import {
  canTrackWithPlannerContext,
  seedPlannerStorage,
} from "@/modules/fan/services/planner-storage";
import type { DashboardItem, PlannerContext } from "./following-types";
import {
  buildDashboardItem,
  buildRecommendation,
  readPlannerContext,
  sortDashboardItems,
} from "./following-domain";

export function useFollowingDashboard(data: {
  isAuthenticated: boolean;
  followedNganyas: any[];
  nganyas: any[];
  liveNganyas: any[];
  recentSightings: any[];
}) {
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

  const liveById = useMemo(() => new Map<string, any>((liveNganyas || []).map((i: any) => [i.nganya_id, i])), [liveNganyas]);

  const recentById = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of recentSightings || []) { if (!m.has(s.nganya_id)) m.set(s.nganya_id, s); }
    return m;
  }, [recentSightings]);

  const followedItems = useMemo(() => {
    const enriched = followedNganyas
      .map((follow: any) => {
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
      .filter((n) => !followedIds.has(n.id) && followOverrides[n.id]?.isFollowing !== true)
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

  // Realtime subscriptions
  useEffect(() => {
    if (!isAuthenticated || followedItems.length === 0) return;
    const corridorIds = Array.from(new Set(followedItems.map((i) => i.corridorId).filter(Boolean))) as string[];
    if (corridorIds.length === 0) return;

    const channels = corridorIds.map((cId) =>
      supabase.channel(`following_dashboard_${cId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions", filter: `corridor_id=eq.${cId}` }, () => queueRefresh())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "sightings", filter: `corridor_id=eq.${cId}` }, () => queueRefresh())
        .subscribe(),
    );
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [isAuthenticated, followedItems, queueRefresh]);

  const runMutation = async (id: string, task: () => Promise<void>) => {
    setMutatingIds((c) => ({ ...c, [id]: true }));
    try { await task(); await queueRefresh(); } catch (error) { showErrorToast(error, "Failed to update follow."); throw error; } finally {
      setMutatingIds((c) => { const n = { ...c }; delete n[id]; return n; });
    }
  };

  const handleToggleFollow = async (item: DashboardItem, isFollowing: boolean) => {
    const prev = followOverrides[item.id];
    setFollowOverrides((c) => ({ ...c, [item.id]: { ...c[item.id], isFollowing: !isFollowing } }));
    try { await runMutation(item.id, async () => { if (isFollowing) await unfollowNganya(item.id); else await followNganya(item.id); }); } catch {
      setFollowOverrides((c) => { const n = { ...c }; if (prev) n[item.id] = prev; else delete n[item.id]; return n; });
    }
  };

  const handleToggleAlerts = async (item: DashboardItem, nextNotifyLive: boolean) => {
    const prev = followOverrides[item.id];
    setFollowOverrides((c) => ({ ...c, [item.id]: { ...c[item.id], notifyLive: nextNotifyLive } }));
    try { await runMutation(item.id, async () => { await updateFollowAlerts(item.id, nextNotifyLive); }); } catch {
      setFollowOverrides((c) => { const n = { ...c }; if (prev) n[item.id] = prev; else delete n[item.id]; return n; });
    }
  };

  const planRideFor = (item?: DashboardItem | null, options?: { useRecentStage?: boolean }) => {
    seedPlannerStorage(plannerContext, {
      ...(item || undefined),
      stageId: options?.useRecentStage && item?.recentSighting?.stage_id ? item.recentSighting.stage_id : undefined,
      stageName: options?.useRecentStage && item?.stageLabel ? item.stageLabel : undefined,
    });
    if (options?.useRecentStage && item?.stageLabel) {
      addToast(`Planner set to ${item.stageLabel} on ${item.corridorName} for ${item.name}.`, "info");
    }
    navigate({ to: "/", search: { corridor: item?.corridorId || plannerContext.toPlace?.corridor_id || plannerContext.toPlace?.id || undefined } as any });
  };

  const canTrackItem = (item: DashboardItem) => canTrackWithPlannerContext(plannerContext, item);

  const handlePrimaryAction = (item: DashboardItem) => {
    if ((item.status === "LIVE_NOW" || item.status === "RECENTLY_SEEN") && canTrackItem(item)) { setTrackingItem(item); return; }
    if (item.status === "OFFLINE" && !item.notifyLive) { void handleToggleAlerts(item, true); return; }
    if (item.status === "RECENTLY_SEEN") { navigate({ to: "/nganya/$slug", params: { slug: item.slug } }); return; }
    planRideFor(item);
  };

  const handleSecondaryAction = (item: DashboardItem) => {
    if (item.status === "OFFLINE" && item.notifyLive) { navigate({ to: "/discover", search: { corridor: item.corridorId || undefined, vibe: item.tags[0] || undefined } as any }); return; }
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
