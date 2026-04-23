import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import { SectionBoundary } from "@/components/error/SectionBoundary";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import LiveBadge from "@/components/ui/LiveBadge";
import Skeleton from "@/components/ui/Skeleton";
import { formatRelativeTime, toNganyaSlug } from "@/lib/formatters";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";
import { Clock, TrendingUp, ChevronRight } from "lucide-react";
import WhereToCard, {
  type RideSearchPayload,
} from "@/components/features/WhereToCard";
import SearchResultsOverlayV2 from "@/components/features/SearchResultsOverlayV2";
import { followNganya, unfollowNganya } from "@/lib/queries/follows";
import {
  canTrackWithPlannerContext,
  readPlannerStorageContext,
  seedPlannerStorage,
} from "@/modules/fan/services/planner-storage";
import type { FanHomeRouteData } from "@/modules/fan/services/route-data";

interface HomeScreenProps {
  data: FanHomeRouteData;
  activeCorridor: string | null;
  onCorridorChange: (corridorId: string | null) => void;
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

function getDirectionLabel(
  direction: string | null | undefined,
  corridorName: string,
) {
  if (!direction) return null;

  const normalized = direction.toUpperCase();
  if (normalized.includes("TOWN")) return "→ Town";
  if (normalized.includes("TERMINAL")) return `→ ${corridorName}`;
  return direction;
}

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
  showAllRecent,
}: HomeScreenProps) {
  const router = useRouter();
  const { showErrorToast, addToast } = useToast();
  const [plannerContext, setPlannerContext] = useState(() =>
    readPlannerStorageContext(),
  );
  const [plannerSearch, setPlannerSearch] = useState<RideSearchPayload | null>(
    null,
  );
  const [trackingRow, setTrackingRow] =
    useState<AggregatedRecentSightingRow | null>(null);
  const [trackingNganya, setTrackingNganya] =
    useState<BrowseCardActionItem | null>(null);
  const [plannerSeed, setPlannerSeed] = useState(0);
  const [recentFilter, setRecentFilter] = useState<RecentSightingFilter>("ALL");
  const { corridors, nganyas, liveNganyas, recentSightings, followedIds } =
    data;

  const toggleFollow = async (id: string) => {
    try {
      if (followedIds.has(id)) {
        await unfollowNganya(id);
      } else {
        await followNganya(id);
      }
      await router.invalidate();
    } catch (error) {
      showErrorToast(error, "Failed to update follow.");
    }
  };

  const activeCorridorName = useMemo(
    () => corridors.find((c) => c.id === activeCorridor)?.name || null,
    [corridors, activeCorridor],
  );

  const filteredNganyas = useMemo(
    () =>
      activeCorridor
        ? nganyas.filter((n) => n.corridor_id === activeCorridor)
        : nganyas,
    [nganyas, activeCorridor],
  );

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
    const nextPlannerContext = readPlannerStorageContext();
    seedPlannerStorage(
      nextPlannerContext,
      {
        id: item.id,
        name: item.name,
        corridorId: item.corridorId,
        corridorName: item.corridorName,
      },
      { clearStageOnRouteChange: true },
    );

    setPlannerContext(readPlannerStorageContext());
    setPlannerSearch(null);
    setPlannerSeed((current) => current + 1);
    onCorridorChange(item.corridorId);
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

  const handlePlannerSearch = (payload: RideSearchPayload) => {
    setPlannerSearch(payload);
    setPlannerContext({
      toPlace: payload.toPlace,
      fromStage: payload.fromStage,
      preferredNganya: payload.preferredNganya,
      preference: payload.preference,
    });
    onCorridorChange(payload.toPlace.corridor_id || payload.toPlace.id);
  };

  const handlePlannerRouteChange = (
    corridorId: string | null,
    corridorName?: string | null,
  ) => {
    onCorridorChange(corridorId);
    setPlannerSearch(null);
    setPlannerContext((current) => ({
      ...current,
      toPlace: corridorId
        ? {
            id: corridorId,
            name: corridorName || current.toPlace?.name || "Route",
            corridor_id: corridorId,
          }
        : null,
      fromStage:
        corridorId &&
        (current.toPlace?.corridor_id || current.toPlace?.id) === corridorId
          ? current.fromStage
          : null,
      preferredNganya: null,
      preference: "ANY",
    }));
  };

  const handlePlanRideForRecentRow = (row: AggregatedRecentSightingRow) => {
    const nextPlannerContext = readPlannerStorageContext();
    seedPlannerStorage(
      nextPlannerContext,
      {
        id: row.nganyaId,
        name: row.nganyaName,
        corridorId: row.corridorId,
        corridorName: row.corridorName,
      },
      { clearStageOnRouteChange: true },
    );

    setPlannerContext(readPlannerStorageContext());
    setPlannerSearch(null);
    setPlannerSeed((current) => current + 1);
    onCorridorChange(row.corridorId);
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

  return (
    <div className="page-container py-8 md:py-10 space-y-10 md:space-y-12">
      <section className="space-y-2">
        <p className="text-tag text-[var(--color-accent)]">Nairobi Streets</p>
        <h1 className="text-h1">Plan fast, catch faster</h1>
        <p className="text-body text-[var(--color-text-secondary)] max-w-2xl">
          Choose terminal route, pickup stage, and optionally your nganya.
          Everything below syncs to your selected route.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-[84px] space-y-3">
          <WhereToCard
            key={plannerSeed}
            onCorridorChange={handlePlannerRouteChange}
            onSearch={handlePlannerSearch}
            onClear={() => {
              setPlannerSearch(null);
              onCorridorChange(null);
            }}
          />
          {activeCorridorName && (
            <div className="text-xs text-[var(--color-text-tertiary)] px-2">
              Synced route filter:{" "}
              <span className="text-[var(--color-text-primary)] font-medium">
                {activeCorridorName}
              </span>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-col">
                <h2 className="text-h3">Top Answers</h2>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Route-scoped options with ETA and confidence
                </p>
              </div>
            </div>

            {plannerSearch ? (
              <SectionBoundary
                title="Trip planner failed to render"
                areaLabel="fan-home-planner"
                onRetry={() => setPlannerSearch(null)}
              >
                <SearchResultsOverlayV2
                  inline
                  isOpen
                  onClose={() => setPlannerSearch(null)}
                  fromStage={plannerSearch.fromStage}
                  toPlace={plannerSearch.toPlace}
                  preference={plannerSearch.preference}
                  preferredNganya={plannerSearch.preferredNganya}
                />
              </SectionBoundary>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Set route and pickup stage to get ranked matches instantly.
                </p>
                {filteredLiveNganyas.length > 0 ? (
                  <div className="space-y-2">
                    {filteredLiveNganyas.slice(0, 3).map((n) => {
                      const cardData = mapSupabaseToCardProps(n);
                      if (!cardData) return null;
                      return (
                        <Card
                          key={cardData.id}
                          nganya={cardData as any}
                          variant="compact"
                          isFollowing={followedIds.has(cardData.id)}
                          onFollow={toggleFollow}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-[var(--color-text-secondary)] border border-dashed border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
                    No live sessions right now. Use recent sightings below while
                    planning.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
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
      </section>

      <section>
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
                  <button
                    key={row.key}
                    onClick={() => handleRecentRowAction(row)}
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
                  </button>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">Browse Builds</h2>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {activeCorridorName ? activeCorridorName : "All routes"}
          </span>
        </div>

        <div className="grid-cards">
          {filteredNganyas.map((n) => {
            const cardData = mapSupabaseToCardProps(n);
            if (!cardData) return null;
            return (
              <Card
                key={cardData.id}
                nganya={cardData as any}
                variant="standard"
                isFollowing={followedIds.has(cardData.id)}
                onFollow={toggleFollow}
                primaryAction={{
                  label:
                    cardData.isLive &&
                    canTrackWithPlannerContext(plannerContext, cardData)
                      ? "Track"
                      : "Plan ride",
                  onClick: () => handleBrowseCardAction(cardData),
                }}
                secondaryAction={{
                  label: followedIds.has(cardData.id) ? "Following" : "Follow",
                  onClick: () => void toggleFollow(cardData.id),
                  variant: "secondary",
                }}
              />
            );
          })}
        </div>
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

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">
        <div className="lg:col-span-4 space-y-3">
          <Skeleton className="h-64 rounded-[var(--radius-xl)]" />
        </div>
        <div className="lg:col-span-8">
          <Skeleton className="h-72 rounded-[var(--radius-xl)]" />
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
