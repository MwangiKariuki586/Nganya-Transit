import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/Toast";
import SearchInput from "@/components/ui/SearchInput";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import SearchResultsOverlayV2 from "@/components/features/SearchResultsOverlayV2";
import { toNganyaSlug } from "@/lib/formatters";
import { vibeTagColors } from "@/lib/mockData";
import { SlidersHorizontal } from "lucide-react";
import { followNganya, unfollowNganya } from "@/lib/queries/follows";
import {
  canTrackWithPlannerContext,
  readPlannerStorageContext,
  seedPlannerStorage,
} from "@/modules/fan/services/planner-storage";
import type { DiscoverRouteData } from "@/modules/fan/services/route-data";

const allVibeTags = Object.keys(vibeTagColors);

interface DiscoverScreenProps {
  data: DiscoverRouteData;
  onSearchChange: (
    search: string,
    activeCorridor: string | null,
    activeVibe: string | null,
  ) => void;
}

function DiscoverScreen({ data, onSearchChange }: DiscoverScreenProps) {
  const router = useRouter();
  const { showErrorToast, addToast } = useToast();
  const [trackingNganya, setTrackingNganya] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const {
    search,
    activeCorridor,
    activeVibe,
    nganyas,
    corridors,
    liveNganyas,
    followedIds,
  } = data;

  const filtered = useMemo(() => {
    return nganyas.filter((n) => {
      const matchesCorridor =
        !activeCorridor || n.corridor_id === activeCorridor;
      const matchesVibe =
        !activeVibe || (n.tags && n.tags.includes(activeVibe));
      return matchesCorridor && matchesVibe;
    });
  }, [nganyas, activeCorridor, activeVibe]);

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

  const clearFilters = () => {
    onSearchChange("", null, null);
  };

  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;

    const isLive =
      liveNganyas.some((ln) => ln.nganya_id === dbNganya.id) ||
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

  const handleBrowseCardAction = (cardData: any) => {
    const plannerContext = readPlannerStorageContext();

    if (cardData.isLive && canTrackWithPlannerContext(plannerContext, cardData)) {
      setTrackingNganya({ id: cardData.id, name: cardData.name });
      return;
    }

    seedPlannerStorage(
      plannerContext,
      {
        id: cardData.id,
        name: cardData.name,
        corridorId: cardData.corridorId,
        corridorName: cardData.corridorName,
      },
      { clearStageOnRouteChange: true },
    );

    addToast(
      `Route set to ${cardData.corridorName}. Pick your pickup stage on Home to plan with ${cardData.name}.`,
      "info",
    );

    router.navigate({
      to: "/",
      search: {
        corridor: cardData.corridorId || undefined,
      } as any,
    });
  };

  return (
    <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16">
      <div className="mb-6">
        <h1 className="text-h1 mb-2">Discover</h1>
        <p className="text-body-sm text-[var(--color-text-secondary)]">
          Find nganyas by name, route, or vibe
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-60 shrink-0 space-y-6">
          <div>
            <h3 className="text-caption text-[var(--color-text-tertiary)] mb-3">
              <SlidersHorizontal className="w-3 h-3 inline mr-1" />
              Corridors
            </h3>
            <div className="space-y-1.5">
              {corridors.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    onSearchChange(
                      search,
                      activeCorridor === c.id ? null : c.id,
                      activeVibe,
                    )
                  }
                  className={`w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm transition-all cursor-pointer ${
                    activeCorridor === c.id
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--color-line)] pt-6">
            <h3 className="text-caption text-[var(--color-text-tertiary)] mb-3">
              Vibe Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {allVibeTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  variant="vibe"
                  color={activeVibe === tag ? vibeTagColors[tag] : undefined}
                  onClick={() =>
                    onSearchChange(
                      search,
                      activeCorridor,
                      activeVibe === tag ? null : tag,
                    )
                  }
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <SearchInput
            value={search}
            onChange={(nextSearch) =>
              onSearchChange(nextSearch, activeCorridor, activeVibe)
            }
            className="mb-4"
          />

          <div className="lg:hidden flex gap-2 overflow-x-auto scroll-hidden pb-3 mb-4 -mx-5 px-5">
            <Chip
              label="All Routes"
              variant="route"
              isActive={!activeCorridor}
              onClick={() => onSearchChange(search, null, activeVibe)}
            />
            {corridors.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                variant="route"
                isActive={activeCorridor === c.id}
                onClick={() =>
                  onSearchChange(
                    search,
                    activeCorridor === c.id ? null : c.id,
                    activeVibe,
                  )
                }
              />
            ))}
          </div>

          <div className="lg:hidden flex gap-2 overflow-x-auto scroll-hidden pb-3 mb-4 -mx-5 px-5">
            {allVibeTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                variant="vibe"
                color={activeVibe === tag ? vibeTagColors[tag] : undefined}
                onClick={() =>
                  onSearchChange(
                    search,
                    activeCorridor,
                    activeVibe === tag ? null : tag,
                  )
                }
              />
            ))}
          </div>

          <p className="text-body-sm text-[var(--color-text-tertiary)] mb-4">
            {filtered.length} nganya{filtered.length !== 1 ? "s" : ""} found
          </p>

          {filtered.length > 0 ? (
            <div className="grid-cards">
              {filtered.map((n) => {
                const cardProps = mapSupabaseToCardProps(n);
                if (!cardProps) return null;
                return (
                  <Card
                    key={cardProps.id}
                    nganya={cardProps as any}
                    variant="standard"
                    isFollowing={followedIds.has(cardProps.id)}
                    onFollow={toggleFollow}
                    primaryAction={{
                      label:
                        cardProps.isLive &&
                        canTrackWithPlannerContext(
                          readPlannerStorageContext(),
                          cardProps,
                        )
                          ? "Track"
                          : "Plan ride",
                      onClick: () => handleBrowseCardAction(cardProps),
                    }}
                    secondaryAction={{
                      label: followedIds.has(cardProps.id)
                        ? "Following"
                        : "Follow",
                      onClick: () => void toggleFollow(cardProps.id),
                      variant: "secondary",
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState variant="no-results" onAction={clearFilters} />
          )}
        </div>
      </div>

      {trackingNganya ? (
        (() => {
          const plannerContext = readPlannerStorageContext();
          if (!plannerContext.toPlace || !plannerContext.fromStage) return null;

          return (
            <SearchResultsOverlayV2
              isOpen
              onClose={() => setTrackingNganya(null)}
              fromStage={plannerContext.fromStage}
              toPlace={plannerContext.toPlace}
              preference="SPECIFIC"
              preferredNganya={trackingNganya}
            />
          );
        })()
      ) : null}
    </div>
  );
}

export default DiscoverScreen;
