import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import SearchInput from "@/components/ui/SearchInput";
import LiveBadge from "@/components/ui/LiveBadge";
import EmptyState from "@/components/ui/EmptyState";
import InlineSpinner from "@/components/ui/InlineSpinner";
import BottomSheet from "@/components/ui/BottomSheet";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { vibeTagColors } from "@/lib/mockData";
import { BadgeCheck, SlidersHorizontal, TrendingUp } from "lucide-react";
import { mapNganyaToCardProps } from "./discover/discover-domain";
import { SORT_OPTIONS } from "./discover/discover-types";
import { useDiscoverCatalogue } from "./discover/useDiscoverCatalogue";
import type { DiscoverRouteData } from "@/modules/fan/services/route-data";
import { useToast } from "@/components/ui/ToastContainer";
import {
  applyPlannerSeed,
  canTrackWithPlannerContext,
  readPlannerStorageContext,
  writePlannerStorageContext,
} from "@/modules/fan/services/planner-storage";

const allVibeTags = Object.keys(vibeTagColors);

interface DiscoverScreenProps {
  data: DiscoverRouteData;
  /** Pre-select a corridor filter on mount (e.g. from a "view all" link on the home page). */
  initialCorridorId?: string | null;
}

function DiscoverScreen({
  data,
  initialCorridorId = null,
}: DiscoverScreenProps) {
  const {
    corridors,
    featuredLive,
    initialNganyas,
    liveNganyas,
    followedIds,
    totalCount,
    initialHasMore,
    initialNextOffset,
  } = data;

  const { addToast } = useToast();

  const catalogue = useDiscoverCatalogue({
    initialNganyas,
    initialHasMore,
    initialNextOffset,
    totalCount,
    initialFollowedIds: followedIds,
    liveNganyas,
    corridors,
    initialCorridorId,
  });

  const featuredCards = useMemo(
    () =>
      featuredLive
        .map((n) => mapNganyaToCardProps(n, liveNganyas))
        .filter(Boolean),
    [featuredLive, liveNganyas],
  );

  // ── Plan ride / Track CTA ─────────────────────────────────────────────────
  const handleCardAction = (cardData: any) => {
    const plannerContext = readPlannerStorageContext();
    if (
      cardData.isLive &&
      canTrackWithPlannerContext(plannerContext, cardData)
    ) {
      // Navigate to home where the tracker lives
      window.location.href = "/";
      return;
    }
    // Seed the planner and navigate home to the WhereToCard
    const next = applyPlannerSeed(
      plannerContext,
      {
        id: cardData.id,
        name: cardData.name,
        corridorId: cardData.corridorId,
        corridorName: cardData.corridorName,
      },
      { clearStageOnRouteChange: true },
    );
    // Persist to localStorage so the home page picks it up
    writePlannerStorageContext(next);
    addToast(
      `Route set to ${cardData.corridorName}. Pick your pickup stage to plan with ${cardData.name}.`,
      "info",
    );
    window.location.href = "/";
  };

  const hasActiveFilters = catalogue.isFiltered;
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Count of active "drawer" filters so the button can show a badge.
  const drawerActiveCount = [
    catalogue.filters.vibe !== null,
    catalogue.filters.sort !== "trending",
    catalogue.filters.verifiedOnly,
  ].filter(Boolean).length;

  const filterDrawerContent = (
    <div className="space-y-7 pt-2">
      {/* Sort */}
      <div>
        <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
          Sort by
        </p>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={opt.label}
              variant="route"
              isActive={catalogue.filters.sort === opt.key}
              onClick={() => catalogue.setSort(opt.key)}
            />
          ))}
        </div>
      </div>

      {/* Vibe tags */}
      <div>
        <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
          Vibe
        </p>
        <div className="flex flex-wrap gap-2">
          {allVibeTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              variant="vibe"
              color={
                catalogue.filters.vibe === tag ? vibeTagColors[tag] : undefined
              }
              onClick={() =>
                catalogue.setVibe(catalogue.filters.vibe === tag ? null : tag)
              }
            />
          ))}
        </div>
      </div>

      {/* Verified only */}
      <div>
        <p className="text-caption text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
          Other
        </p>
        <button
          onClick={() =>
            catalogue.setVerifiedOnly(!catalogue.filters.verifiedOnly)
          }
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border text-sm font-medium transition-all cursor-pointer ${
            catalogue.filters.verifiedOnly
              ? "bg-[var(--color-accent-soft)] border-[var(--color-accent)]/60 text-[var(--color-accent)]"
              : "bg-[rgba(255,255,255,0.02)] border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/25 hover:text-[var(--color-text-primary)]"
          }`}
          aria-pressed={catalogue.filters.verifiedOnly}
        >
          <BadgeCheck className="w-4 h-4" />
          Verified only
        </button>
      </div>

      {/* Clear drawer filters */}
      {drawerActiveCount > 0 && (
        <button
          onClick={() => {
            catalogue.setVibe(null);
            catalogue.setSort("trending");
            catalogue.setVerifiedOnly(false);
          }}
          className="w-full py-2.5 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer border border-dashed border-[var(--color-line)] rounded-[var(--radius-md)]"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="page-container pt-8 pb-16 md:pt-10 space-y-8 md:space-y-10">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="space-y-1">
        <p className="text-tag text-[var(--color-accent)]">Explore</p>
        <h1 className="text-h1">Discover Nganyas</h1>
        <p className="text-body text-[var(--color-text-secondary)] max-w-2xl">
          {totalCount} nganyas across {corridors.length} routes.
        </p>
      </section>

      {/* ── Curated strip: Live right now ─────────────────────────────────── */}
      {featuredCards.length > 0 && (
        <section aria-label="Live right now">
          <div className="flex items-center gap-2 mb-3">
            <LiveBadge />
            <span className="text-h4">Live right now</span>
          </div>
          <div className="flex gap-4 overflow-x-auto scroll-hidden pb-2 -mx-5 px-5 md:-mx-8 md:px-8">
            {featuredCards.map((cardData) => (
              <div
                key={cardData.id}
                className="shrink-0 w-[260px] md:w-[300px]"
              >
                <Card
                  nganya={cardData as any}
                  variant="standard"
                  isFollowing={catalogue.followedIds.has(cardData.id)}
                  onFollow={catalogue.toggleFollow}
                  primaryAction={{
                    label: "Track",
                    onClick: () => handleCardAction(cardData),
                  }}
                  secondaryAction={{
                    label: catalogue.followedIds.has(cardData.id)
                      ? "Following"
                      : "Follow",
                    onClick: () => void catalogue.toggleFollow(cardData.id),
                    variant: "secondary",
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Sticky control bar ────────────────────────────────────────────── */}
      <div
        className="sticky top-0 md:top-[var(--top-nav-height)] z-10 -mx-5 px-5 md:-mx-8 md:px-8 py-3 bg-[var(--color-bg-base)]/95 backdrop-blur-lg border-b border-[var(--glass-border)] -mt-4 md:-mt-5"
        role="search"
        aria-label="Filter nganyas"
      >
        {/* Search + Filters button */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <SearchInput
              value={catalogue.rawSearch}
              onChange={catalogue.setSearch}
              placeholder="Search by name, route, or tag..."
            />
            {catalogue.isSearching && (
              <span className="absolute right-10 top-1/2 -translate-y-1/2">
                <InlineSpinner className="h-4 w-4 text-[var(--color-accent)]" />
              </span>
            )}
          </div>

          {/* Filters button — opens drawer */}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className={`shrink-0 relative inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-md)] border text-sm font-medium transition-all cursor-pointer ${
              drawerActiveCount > 0
                ? "bg-[var(--color-accent-soft)] border-[var(--color-accent)]/60 text-[var(--color-accent)]"
                : "bg-[rgba(255,255,255,0.02)] border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/25 hover:text-[var(--color-text-primary)]"
            }`}
            aria-label="Open filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {drawerActiveCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold leading-none text-[var(--color-accent-foreground)]">
                {drawerActiveCount}
              </span>
            )}
          </button>
        </div>

        {/* Corridor pills — always visible below search */}
        <div className="flex gap-2 overflow-x-auto scroll-hidden pb-1 pt-3 -mx-5 px-5 md:-mx-8 md:px-8">
          <Chip
            label="All"
            variant="route"
            isActive={!catalogue.filters.corridorId}
            onClick={() => catalogue.setCorridorId(null)}
          />
          {corridors.map((c) => (
            <Chip
              key={c.id}
              label={
                c.liveCount > 0 ? `${c.name} · ${c.liveCount} live` : c.name
              }
              variant="route"
              isActive={catalogue.filters.corridorId === c.id}
              onClick={() =>
                catalogue.setCorridorId(
                  catalogue.filters.corridorId === c.id ? null : c.id,
                )
              }
            />
          ))}
        </div>
      </div>

      {/* ── Filter drawer ─────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title="Filters"
      >
        {filterDrawerContent}
      </BottomSheet>

      {/* ── Single adaptive results grid ──────────────────────────────────── */}
      <section aria-label="Results">
        {/* Contextual label + count */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span className="text-h4 capitalize">{catalogue.resultLabel}</span>
          </div>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {catalogue.totalFilteredCount}{" "}
            {catalogue.totalFilteredCount === 1 ? "nganya" : "nganyas"}
          </span>
        </div>

        {/* Grid */}
        {catalogue.items.length > 0 ? (
          <div className="grid-cards">
            {catalogue.items.map((cardData) => (
              <Card
                key={cardData.id}
                nganya={cardData as any}
                variant="standard"
                isFollowing={catalogue.followedIds.has(cardData.id)}
                onFollow={catalogue.toggleFollow}
                primaryAction={{
                  label:
                    cardData.isLive &&
                    canTrackWithPlannerContext(
                      readPlannerStorageContext(),
                      cardData,
                    )
                      ? "Track"
                      : "Plan ride",
                  onClick: () => handleCardAction(cardData),
                }}
                secondaryAction={{
                  label: catalogue.followedIds.has(cardData.id)
                    ? "Following"
                    : "Follow",
                  onClick: () => void catalogue.toggleFollow(cardData.id),
                  variant: "secondary",
                }}
              />
            ))}
          </div>
        ) : catalogue.isSearching ? (
          /* Skeleton while searching */
          <div className="grid-cards">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          /* Empty state with contextual messaging */
          <EmptyState
            variant="no-results"
            title={
              catalogue.filters.search
                ? `No results for "${catalogue.filters.search}"`
                : hasActiveFilters
                  ? "No matches for these filters"
                  : "No nganyas yet"
            }
            message={
              hasActiveFilters
                ? "Try removing a filter or broadening your search."
                : "Check back soon — more nganyas are being added."
            }
            actionLabel={hasActiveFilters ? "Clear filters" : undefined}
            onAction={hasActiveFilters ? catalogue.resetFilters : undefined}
          />
        )}

        {/* Load-more sentinel for infinite scroll */}
        <div ref={catalogue.sentinelRef} className="h-1 mt-4" />

        {/* Sparse-data fallback hint */}
        {!catalogue.isSearching &&
          catalogue.items.length > 0 &&
          catalogue.items.length < 4 &&
          hasActiveFilters && (
            <p className="mt-6 text-center text-xs text-[var(--color-text-tertiary)]">
              Only {catalogue.items.length} match
              {catalogue.items.length !== 1 ? "es" : ""}.{" "}
              <button
                onClick={catalogue.resetFilters}
                className="text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                Show all nganyas
              </button>
            </p>
          )}
      </section>
    </div>
  );
}

export default DiscoverScreen;
