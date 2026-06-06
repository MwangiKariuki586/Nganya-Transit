import { Suspense, lazy, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import Skeleton from "@/components/ui/Skeleton";
import type { FanHomeRouteData } from "@/modules/fan/services/route-data";
import {
  enrichNganyaImageFields,
  mapNganyaRecordToCardData,
} from "@/modules/fan/lib/nganya-card";
import type { FanLiveNganyaRecord, FanNganyaRecord } from "@/modules/fan/lib/fan-data";
import {
  aggregateRecentSightings,
  countHighActivityRecentSightings,
  countOnRouteRecentSightings,
  filterAggregatedRecentSightings,
  filterRecentSightingsByCorridor,
} from "@/modules/fan/screens/home/home-recent-sightings";
import { HomeLiveRouteSection } from "@/modules/fan/screens/home/HomeLiveRouteSection";
import { HomeRecentSightingsSection } from "@/modules/fan/screens/home/HomeRecentSightingsSection";
import { HomeRideWatchSection } from "@/modules/fan/screens/home/HomeRideWatchSection";
import type { RecentSightingFilter } from "@/modules/fan/screens/home/home-types";
import { useHomeFollowActions } from "@/modules/fan/screens/home/useHomeFollowActions";
import { useHomePlanner } from "@/modules/fan/screens/home/useHomePlanner";

const LazyLiveCorridorMap = lazy(
  () => import("@/components/features/tracking/LiveCorridorMap"),
);
const LazyWhereToCard = lazy(() => import("@/components/features/WhereToCard"));
const LazySearchResultsOverlay = lazy(
  () => import("@/components/features/SearchResultsOverlayV2"),
);

interface HomeScreenProps {
  data: FanHomeRouteData;
  activeCorridor: string | null;
  onCorridorChange: (corridorId: string | null) => void;
  showAllRecent: boolean;
}

export default function HomeScreen({
  data,
  activeCorridor,
  onCorridorChange,
  showAllRecent,
}: HomeScreenProps) {
  const router = useRouter();
  const [recentFilter, setRecentFilter] = useState<RecentSightingFilter>("ALL");
  const {
    corridors,
    nganyas,
    liveNganyas,
    recentSightings,
    followedIds,
  } = data;

  const {
    plannerAlertIds,
    handlePlannerAlertAction,
    isFollowingNganya,
    toggleFollow,
  } = useHomeFollowActions(followedIds);

  const planner = useHomePlanner({
    activeCorridor,
    corridors,
    liveNganyas,
    onCorridorChange,
  });

  const hasSelectedRouteLiveNganyas =
    Boolean(activeCorridor) && planner.filteredLiveNganyas.length > 0;

  const shouldShowRecentSightings =
    !activeCorridor || planner.filteredLiveNganyas.length === 0;

  const filteredRecentSightings = useMemo(
    () =>
      filterRecentSightingsByCorridor({
        recentSightings,
        activeCorridor,
        activeCorridorName: planner.activeCorridorName,
      }),
    [recentSightings, activeCorridor, planner.activeCorridorName],
  );

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

  const filteredAggregatedRecentSightings = useMemo(
    () => filterAggregatedRecentSightings(aggregatedRecentSightings, recentFilter),
    [aggregatedRecentSightings, recentFilter],
  );

  const recentSummaryCount = aggregatedRecentSightings.length;
  const onRouteRecentCount = useMemo(
    () => countOnRouteRecentSightings(aggregatedRecentSightings),
    [aggregatedRecentSightings],
  );
  const highActivityRecentCount = useMemo(
    () => countHighActivityRecentSightings(aggregatedRecentSightings),
    [aggregatedRecentSightings],
  );

  const featuredLiveNganya =
    planner.filteredLiveNganyas.find((n) => n.tags?.includes("NEW_BUILD")) ??
    planner.filteredLiveNganyas[0] ??
    null;

  const consolidatedLiveRouteCards = useMemo(
    () =>
      planner.filteredLiveNganyas.filter(
        (n) => n.nganya_id !== featuredLiveNganya?.nganya_id,
      ),
    [featuredLiveNganya, planner.filteredLiveNganyas],
  );

  const fullHomepageNganyasById = useMemo(
    () =>
      new Map(
        nganyas
          .map((nganya) => [nganya.id || nganya.nganya_id, nganya] as const)
          .filter(
            (entry): entry is [string, FanNganyaRecord] => Boolean(entry[0]),
          ),
      ),
    [nganyas],
  );

  const mapSupabaseToCardProps = (dbNganya: FanLiveNganyaRecord) =>
    mapNganyaRecordToCardData(
      enrichNganyaImageFields(dbNganya, fullHomepageNganyasById),
      { liveNganyas: planner.filteredLiveNganyas },
    );

  const featuredLiveCardData = featuredLiveNganya
    ? mapSupabaseToCardProps(featuredLiveNganya)
    : null;

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
        ref={planner.plannerMapSectionRef}
        className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12 lg:items-stretch"
        style={{ scrollMarginTop: planner.plannerMapScrollMargin }}
      >
        <div className="space-y-3 lg:col-span-4 lg:sticky lg:top-[84px] lg:self-start">
          <Suspense
            fallback={
              <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] p-4">
                <Skeleton className="h-[320px] rounded-[var(--radius-xl)]" />
              </div>
            }
          >
            <LazyWhereToCard
              key={planner.plannerSeed}
              value={planner.plannerContext}
              onChange={planner.handlePlannerChange}
              onSearch={planner.handlePlannerSearch}
              onClear={planner.handlePlannerClear}
            />
          </Suspense>
        </div>

        <div className="min-h-[320px] lg:col-span-8 lg:min-h-0 lg:self-stretch">
          <div className="h-full rounded-[var(--radius-xl)]">
            <div className="h-full overflow-hidden rounded-[var(--radius-xl)]">
              <Suspense
                fallback={
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-[var(--radius-xl)] bg-[var(--glass-bg)] text-xs text-[var(--color-text-tertiary)]">
                    Loading live map...
                  </div>
                }
              >
                <LazyLiveCorridorMap
                  isActive
                  corridorId={planner.mapCorridorId}
                  corridorName={planner.mapCorridorName}
                  pickupStage={planner.plannerContext.fromStage}
                  journeyResults={planner.mapJourneyResults}
                  visibleNganyaIds={planner.visibleNganyaIds}
                  highlightNganyaId={
                    planner.plannerTracking?.nganya_id ??
                    (planner.plannerContext.preference === "SPECIFIC"
                      ? (planner.plannerContext.preferredNganya?.id ?? null)
                      : null)
                  }
                  onTrackNganya={(journey) => void planner.trackPlannerRideOnMap(journey)}
                  fillRowHeight
                  showCaption={false}
                  showNoCorridorOverlay={false}
                  flushBottom={!!planner.plannerTracking}
                  routeLine={planner.plannerRouteLine}
                  routeEtaSeconds={planner.plannerRouteEtaSeconds}
                  routeDistanceMeters={planner.plannerRouteDistanceMeters}
                  routeSignalType={planner.plannerRouteSignalType}
                  isRouting={planner.plannerRouteLoading}
                  className="h-full min-h-[320px] lg:min-h-0"
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <HomeRideWatchSection
        rideWatchSectionRef={planner.rideWatchSectionRef}
        rideWatchScrollMargin={planner.rideWatchScrollMargin}
        plannerJourneyKey={planner.plannerJourneyKey}
        plannerAssistStatus={planner.plannerAssistStatus}
        plannerRideOptions={planner.plannerRideOptions}
        watchedRide={planner.watchedRide}
        recommendedRide={planner.recommendedRide}
        backupRides={planner.backupRides}
        plannerRiskPrompt={planner.plannerRiskPrompt}
        fromStageName={planner.plannerContext.fromStage?.name}
        isFollowingNganya={isFollowingNganya}
        plannerAlertIds={plannerAlertIds}
        onSwitchRide={planner.switchToPlannerRide}
        onKeepWatching={planner.keepWatchingCurrentRide}
        onPlannerAlertAction={handlePlannerAlertAction}
        onWatchRide={planner.watchPlannerRide}
      />

      {shouldShowRecentSightings ? (
        <HomeRecentSightingsSection
          activeCorridor={activeCorridor}
          plannerContext={planner.plannerContext}
          recentFilter={recentFilter}
          recentSummaryCount={recentSummaryCount}
          onRouteRecentCount={onRouteRecentCount}
          highActivityRecentCount={highActivityRecentCount}
          filteredAggregatedRecentSightings={filteredAggregatedRecentSightings}
          showAllRecent={showAllRecent}
          onSetRecentFilter={setRecentFilter}
          onRecentRowAction={planner.handleRecentRowAction}
          onToggleShowAllRecent={() =>
            router.navigate({
              to: "/",
              search: (current: any) => ({
                ...current,
                recent: showAllRecent ? undefined : "all",
              }),
            })
          }
          onNavigateToSpot={() => router.navigate({ to: "/spot" })}
        />
      ) : null}

      {planner.trackingRow &&
      planner.plannerContext.toPlace &&
      planner.plannerContext.fromStage ? (
        <Suspense fallback={null}>
          <LazySearchResultsOverlay
            isOpen
            onClose={() => planner.setTrackingRow(null)}
            fromStage={planner.plannerContext.fromStage}
            toPlace={planner.plannerContext.toPlace}
            preference="SPECIFIC"
            preferredNganya={{
              id: planner.trackingRow.nganyaId,
              name: planner.trackingRow.nganyaName,
            }}
          />
        </Suspense>
      ) : null}

      {planner.trackingNganya &&
      planner.plannerContext.toPlace &&
      planner.plannerContext.fromStage ? (
        <Suspense fallback={null}>
          <LazySearchResultsOverlay
            isOpen
            onClose={() => planner.setTrackingNganya(null)}
            fromStage={planner.plannerContext.fromStage}
            toPlace={planner.plannerContext.toPlace}
            preference="SPECIFIC"
            preferredNganya={{
              id: planner.trackingNganya.id,
              name: planner.trackingNganya.name,
            }}
          />
        </Suspense>
      ) : null}

      {hasSelectedRouteLiveNganyas && featuredLiveCardData ? (
        <HomeLiveRouteSection
          activeCorridor={activeCorridor!}
          activeCorridorName={planner.activeCorridorName}
          filteredLiveNganyas={planner.filteredLiveNganyas}
          featuredLiveCardData={featuredLiveCardData}
          consolidatedLiveRouteCards={consolidatedLiveRouteCards}
          plannerContext={planner.plannerContext}
          isFollowingNganya={isFollowingNganya}
          onToggleFollow={toggleFollow}
          onBrowseCardAction={planner.handleBrowseCardAction}
          mapSupabaseToCardProps={mapSupabaseToCardProps}
        />
      ) : null}
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
