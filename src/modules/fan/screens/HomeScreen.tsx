/**
 * Home / Feed Screen Ã¢â‚¬â€ route-first planning + culture context.
 */

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import LiveBadge from "@/components/ui/LiveBadge";
import { formatRelativeTime, toNganyaSlug } from "@/lib/formatters";
import { Clock, Eye, TrendingUp, ChevronRight } from "lucide-react";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import WhereToCard, {
  type RideSearchPayload,
} from "@/components/features/WhereToCard";
import SearchResultsOverlayV2 from "@/components/features/SearchResultsOverlayV2";
import { useNganyaStore } from "@/stores/useNganyaStore";
import { useSightingStore } from "@/stores/useSightingStore";

export default function HomeScreen() {
  const [activeCorridor, setActiveCorridor] = useState<string | null>(null);
  const [plannerSearch, setPlannerSearch] = useState<RideSearchPayload | null>(
    null,
  );
  const [following, setFollowing] = useState<Set<string>>(new Set());

  // Use Zustand stores
  const {
    nganyas,
    corridors,
    liveNganyas,
    isLoadingNganyas,
    isLoadingCorridors,
    isLoadingLiveNganyas,
    nganyasError,
    corridorsError,
    liveNganyasError,
    fetchNganyas,
    fetchCorridors,
    fetchLiveNganyas,
  } = useNganyaStore();

  const { recentSightings, fetchRecentSightings } = useSightingStore();

  const isLoading =
    isLoadingNganyas || isLoadingCorridors || isLoadingLiveNganyas;
  const hasError = nganyasError || corridorsError || liveNganyasError;

  useEffect(() => {
    // Fetch all data in parallel on mount
    fetchNganyas();
    fetchCorridors();
    fetchLiveNganyas();
  }, [fetchNganyas, fetchCorridors, fetchLiveNganyas]);

  useEffect(() => {
    // Fetch sightings when corridors are available or activeCorridor changes
    if (!corridors || corridors.length === 0) return;
    const corridorId = activeCorridor || corridors[0]?.id;
    if (!corridorId) return;
    fetchRecentSightings(corridorId);
  }, [activeCorridor, corridors, fetchRecentSightings]);

  const toggleFollow = (id: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeCorridorName = useMemo(
    () => corridors?.find((c) => c.id === activeCorridor)?.name || null,
    [corridors, activeCorridor],
  );

  const filteredNganyas = useMemo(
    () =>
      activeCorridor
        ? (nganyas || []).filter((n) => n.corridor_id === activeCorridor)
        : nganyas || [],
    [nganyas, activeCorridor],
  );

  const filteredLiveNganyas = useMemo(
    () =>
      activeCorridor
        ? (liveNganyas || []).filter((n) => n.corridor_id === activeCorridor)
        : liveNganyas || [],
    [liveNganyas, activeCorridor],
  );

  const filteredRecentSightings = useMemo(() => {
    if (!activeCorridor) return recentSightings || [];
    const routeName = (activeCorridorName || "").toLowerCase();
    return (recentSightings || []).filter((s: any) => {
      if (s.corridor_id) return s.corridor_id === activeCorridor;
      const label = (s.corridor || s.corridor_name || "").toLowerCase();
      if (!routeName) return false;
      return label.includes(routeName) || routeName.includes(label);
    });
  }, [recentSightings, activeCorridor, activeCorridorName]);

  const featuredNganya =
    filteredNganyas?.find((n) => n.tags?.includes("NEW_BUILD")) ??
    filteredNganyas?.[0] ??
    nganyas?.[0];

  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;
    const isLive =
      filteredLiveNganyas?.some((ln) => ln.nganya_id === dbNganya.id) ||
      dbNganya.status === "LIVE";
    return {
      id: dbNganya.nganya_id || dbNganya.id,
      slug:
        dbNganya.slug ||
        dbNganya.nganya_slug ||
        toNganyaSlug(dbNganya.nganya_name || dbNganya.name),
      name: dbNganya.nganya_name || dbNganya.name,
      corridor:
        dbNganya.corridor_name || dbNganya.corridors?.name || "Unknown Route",
      vibeTags: dbNganya.vibeTags || dbNganya.tags || [],
      imageUrl:
        dbNganya.nganya_media?.[0]?.media_url ||
        dbNganya.image_url ||
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
      isLive,
      isNewBuild: dbNganya.tags?.includes("NEW_BUILD") || dbNganya.is_new_build,
      isVerified: dbNganya.is_verified,
      followers: dbNganya.follower_count || 0,
      sightingsToday: dbNganya.sighting_count_today || 0,
      lastSeen: dbNganya.last_seen || "Recently",
    };
  };

  const handlePlannerSearch = (payload: RideSearchPayload) => {
    setPlannerSearch(payload);
    setActiveCorridor(payload.toPlace.corridor_id || payload.toPlace.id);
  };

  const handlePlannerRouteChange = (corridorId: string | null) => {
    setActiveCorridor(corridorId);
    setPlannerSearch(null);
  };

  if (isLoading) {
    return (
      <div className="page-container py-12 flex justify-center">
        <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="page-container py-12 flex justify-center">
        <div className="text-center space-y-4">
          <p className="text-[var(--color-text-primary)]">
            Unable to load data. Please try again.
          </p>
          <button
            onClick={() => {
              fetchNganyas();
              fetchCorridors();
              fetchLiveNganyas();
            }}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            onCorridorChange={handlePlannerRouteChange}
            onSearch={handlePlannerSearch}
            onClear={() => {
              setPlannerSearch(null);
              setActiveCorridor(null);
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
              <SearchResultsOverlayV2
                inline
                isOpen
                onClose={() => setPlannerSearch(null)}
                fromStage={plannerSearch.fromStage}
                toPlace={plannerSearch.toPlace}
                preference={plannerSearch.preference}
                preferredNganya={plannerSearch.preferredNganya}
              />
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
                          isFollowing={following.has(cardData.id)}
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
                    isFollowing={following.has(cardData.id)}
                    onFollow={toggleFollow}
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
          <h2 className="text-h3">Recently Spotted</h2>
          <button className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {(filteredRecentSightings.length > 0
            ? filteredRecentSightings
            : recentSightings
          )
            .slice(0, 4)
            .map((s: any) => {
              const isSupabase = s.nganya !== undefined;
              const title = isSupabase ? s.nganya.name : s.nganyaName;
              const corridorLabel = isSupabase
                ? s.nganya?.corridors?.name ||
                  activeCorridorName ||
                  "Current Route"
                : s.corridor;
              const author = isSupabase ? s.user?.handle : s.spottedBy;
              const hasMedia = isSupabase
                ? s.media_urls?.length > 0
                : s.hasMedia;
              const sightingTime = isSupabase
                ? formatRelativeTime(s.created_at)
                : s.time;

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {title}
                      </span>
                      <ConfidenceBadge
                        level={
                          s.confidence?.confidence_level ||
                          s.confidence ||
                          "HIGH"
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                      <span>{corridorLabel}</span>
                      <span>-</span>
                      <span>{author || "Anonymous"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] shrink-0">
                    <Clock className="w-3 h-3" />
                    {sightingTime}
                  </div>
                  {hasMedia && (
                    <Eye className="w-3.5 h-3.5 text-[var(--color-cyan)] shrink-0" />
                  )}
                </div>
              );
            })}
        </div>
      </section>

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
              isFollowing={following.has(featuredNganya.id)}
              onFollow={toggleFollow}
            />
          </div>
          <div className="md:hidden">
            <Card
              nganya={mapSupabaseToCardProps(featuredNganya) as any}
              variant="standard"
              isFollowing={following.has(featuredNganya.id)}
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
                isFollowing={following.has(cardData.id)}
                onFollow={toggleFollow}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
