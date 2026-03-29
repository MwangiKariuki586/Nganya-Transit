﻿/**
 * Discover Screen â€” Search, filters, and card grid.
 * Desktop: persistent sidebar filters. Mobile: horizontal chip scroll.
 */

import { useState, useMemo, useEffect } from "react";
import SearchInput from "@/components/ui/SearchInput";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import { toNganyaSlug } from "@/lib/formatters";
import { vibeTagColors } from "@/lib/mockData";
import { SlidersHorizontal } from "lucide-react";
import { useNganyaStore } from "@/stores/useNganyaStore";
import { useFollowStore } from "@/stores/useFollowStore";

const allVibeTags = Object.keys(vibeTagColors);

function DiscoverScreen() {
  // UI state (filters remain local as they're not global state)
  const [search, setSearch] = useState("");
  const [activeCorridor, setActiveCorridor] = useState<string | null>(null);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);

  // Use Zustand stores for data and loading states
  const {
    nganyas,
    corridors,
    liveNganyas,
    isLoadingNganyas,
    isLoadingCorridors,
    isLoadingLiveNganyas,
    fetchNganyas,
    fetchCorridors,
    fetchLiveNganyas,
  } = useNganyaStore();

  const { isFollowing, followNganya, unfollowNganya, fetchFollowedNganyas } =
    useFollowStore();

  const isLoading =
    isLoadingNganyas || isLoadingCorridors || isLoadingLiveNganyas;

  // Load data on mount - single useEffect calling store actions
  useEffect(() => {
    fetchNganyas(search, activeCorridor || undefined);
    fetchCorridors();
    fetchLiveNganyas(activeCorridor || undefined);
    fetchFollowedNganyas();
  }, [
    search,
    activeCorridor,
    fetchNganyas,
    fetchCorridors,
    fetchLiveNganyas,
    fetchFollowedNganyas,
  ]);

  const filtered = useMemo(() => {
    return (nganyas || []).filter((n) => {
      const matchesCorridor =
        !activeCorridor || n.corridor_id === activeCorridor;
      const matchesVibe =
        !activeVibe || (n.tags && n.tags.includes(activeVibe));
      return matchesCorridor && matchesVibe;
    });
  }, [nganyas, activeCorridor, activeVibe]);

  const toggleFollow = async (id: string) => {
    try {
      if (isFollowing(id)) {
        await unfollowNganya(id);
      } else {
        await followNganya(id);
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setActiveCorridor(null);
    setActiveVibe(null);
  };

  // Map Supabase models to the exact Card component props expectation
  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;

    const isLive =
      (liveNganyas || []).some((ln) => ln.nganya_id === dbNganya.id) ||
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
      isLive: isLive,
      isNewBuild: dbNganya.tags?.includes("NEW_BUILD") || dbNganya.is_new_build,
      isVerified: dbNganya.is_verified,
      followers: dbNganya.follower_count || 0,
      sightingsToday: dbNganya.sighting_count_today || 0,
      lastSeen: dbNganya.last_seen || "Recently",
    };
  };

  return (
    <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-h1 mb-2">Discover</h1>
        <p className="text-body-sm text-[var(--color-text-secondary)]">
          Find nganyas by name, route, or vibe
        </p>
      </div>

      {/* Layout: sidebar on desktop, stacked on mobile */}
      <div className="flex gap-8">
        {/* â"€â"€â"€ Desktop Sidebar Filters â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        <aside className="hidden lg:block w-60 shrink-0 space-y-6">
          <div>
            <h3 className="text-caption text-[var(--color-text-tertiary)] mb-3">
              <SlidersHorizontal className="w-3 h-3 inline mr-1" />
              Corridors
            </h3>
            <div className="space-y-1.5">
              {(corridors || []).map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setActiveCorridor(activeCorridor === c.id ? null : c.id)
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
                  onClick={() => setActiveVibe(activeVibe === tag ? null : tag)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* â"€â"€â"€ Main Content â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <SearchInput value={search} onChange={setSearch} className="mb-4" />

          {/* Mobile filters â€" horizontal scroll */}
          <div className="lg:hidden flex gap-2 overflow-x-auto scroll-hidden pb-3 mb-4 -mx-5 px-5">
            <Chip
              label="All Routes"
              variant="route"
              isActive={!activeCorridor}
              onClick={() => setActiveCorridor(null)}
            />
            {(corridors || []).map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                variant="route"
                isActive={activeCorridor === c.id}
                onClick={() =>
                  setActiveCorridor(activeCorridor === c.id ? null : c.id)
                }
              />
            ))}
          </div>

          {/* Mobile vibe filter */}
          <div className="lg:hidden flex gap-2 overflow-x-auto scroll-hidden pb-3 mb-4 -mx-5 px-5">
            {allVibeTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                variant="vibe"
                color={activeVibe === tag ? vibeTagColors[tag] : undefined}
                onClick={() => setActiveVibe(activeVibe === tag ? null : tag)}
              />
            ))}
          </div>

          {/* Results count */}
          {isLoading ? (
            <p className="text-body-sm text-[var(--color-text-tertiary)] mb-4 animate-pulse">
              Loading nganyas...
            </p>
          ) : (
            <p className="text-body-sm text-[var(--color-text-tertiary)] mb-4">
              {filtered.length} nganya{filtered.length !== 1 ? "s" : ""} found
            </p>
          )}

          {/* Grid of cards */}
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
                    isFollowing={isFollowing(cardProps.id)}
                    onFollow={toggleFollow}
                  />
                );
              })}
            </div>
          ) : !isLoading ? (
            <EmptyState variant="no-results" onAction={clearFilters} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default DiscoverScreen;
