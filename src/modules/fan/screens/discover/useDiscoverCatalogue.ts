import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import { searchNganyas } from "@/lib/queries/discover";
import { followNganya, unfollowNganya } from "@/lib/queries/follows";
import type { DiscoverCorridorSummary } from "@/modules/fan/services/route-data";
import {
  buildResultLabel,
  mapNganyaToCardProps,
  sortNganyas,
} from "./discover-domain";
import {
  DEFAULT_DISCOVER_FILTERS,
  DISCOVER_PAGE_SIZE,
  type DiscoverFilters,
  type DiscoverSort,
} from "./discover-types";

const SEARCH_DEBOUNCE_MS = 300;

interface UseDiscoverCatalogueOptions {
  allNganyas: any[];
  initialFollowedIds: Set<string>;
  liveNganyas: any[];
  corridors: DiscoverCorridorSummary[];
  /** Pre-select a corridor on mount (e.g. from a "view all on this route" link). */
  initialCorridorId?: string | null;
}

/**
 * Manages all Discover page state: filtering, sorting, pagination, search,
 * and follow mutations. Business logic is isolated here; the screen stays thin.
 *
 * Strategy:
 * - Non-text filters (corridor, vibe, sort, verifiedOnly) are applied
 *   client-side against the SSR-loaded `allNganyas` dataset — instant, no fetch.
 * - Text search is debounced and hits the server via `searchNganyas`.
 * - Pagination is done by slicing — `visibleCount` grows as the user scrolls.
 * - Follow mutations use optimistic updates; they revert on error.
 */
export function useDiscoverCatalogue({
  allNganyas,
  initialFollowedIds,
  liveNganyas,
  corridors,
  initialCorridorId = null,
}: UseDiscoverCatalogueOptions) {
  const router = useRouter();
  const { showErrorToast } = useToast();

  const [filters, setFilters] = useState<DiscoverFilters>(() => ({
    ...DEFAULT_DISCOVER_FILTERS,
    corridorId: initialCorridorId,
  }));
  // rawSearch drives the SearchInput value; filters.search is the debounced version.
  const [rawSearch, setRawSearch] = useState("");

  // Server-fetched results replace allNganyas when text search is active.
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Pagination: visible count grows on scroll.
  const [visibleCount, setVisibleCount] = useState(DISCOVER_PAGE_SIZE);

  // Optimistic follow state, seeded from SSR.
  const [followedIds, setFollowedIds] = useState<Set<string>>(initialFollowedIds);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Base dataset ─────────────────────────────────────────────────────────
  // Use server search results when a text query is active, otherwise SSR data.
  const baseDataset = useMemo(
    () => (filters.search && searchResults !== null ? searchResults : allNganyas),
    [filters.search, searchResults, allNganyas],
  );

  // ── Filtered + sorted (all matching items) ───────────────────────────────
  const allFilteredSorted = useMemo(() => {
    let result = baseDataset;
    if (filters.corridorId) {
      result = result.filter((n) => n.corridor_id === filters.corridorId);
    }
    if (filters.vibe) {
      result = result.filter((n) => n.tags?.includes(filters.vibe));
    }
    if (filters.verifiedOnly) {
      result = result.filter((n) => Boolean(n.is_verified));
    }
    return sortNganyas(result, filters.sort);
  }, [baseDataset, filters.corridorId, filters.vibe, filters.verifiedOnly, filters.sort]);

  // ── Visible slice ────────────────────────────────────────────────────────
  const visibleRaw = useMemo(
    () => allFilteredSorted.slice(0, visibleCount),
    [allFilteredSorted, visibleCount],
  );

  const hasMore = visibleCount < allFilteredSorted.length;

  // Map raw DB rows to Card props once, memoised.
  const items = useMemo(
    () => visibleRaw.map((n) => mapNganyaToCardProps(n, liveNganyas)).filter(Boolean),
    [visibleRaw, liveNganyas],
  );

  // ── Reset visible count on any filter change ─────────────────────────────
  useEffect(() => {
    setVisibleCount(DISCOVER_PAGE_SIZE);
  }, [filters.corridorId, filters.vibe, filters.sort, filters.verifiedOnly, searchResults]);

  // ── Debounced text search ────────────────────────────────────────────────
  const setSearch = useCallback(
    (value: string) => {
      setRawSearch(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

      if (!value.trim()) {
        setFilters((prev) => ({ ...prev, search: "" }));
        setSearchResults(null);
        setVisibleCount(DISCOVER_PAGE_SIZE);
        return;
      }

      searchTimerRef.current = setTimeout(async () => {
        setIsSearching(true);
        setFilters((prev) => ({ ...prev, search: value.trim() }));
        try {
          const results = await searchNganyas(value.trim());
          setSearchResults(results);
          setVisibleCount(DISCOVER_PAGE_SIZE);
        } catch {
          showErrorToast("Search failed. Try again.");
        } finally {
          setIsSearching(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [showErrorToast],
  );

  // ── Filter setters ───────────────────────────────────────────────────────
  const setCorridorId = useCallback((id: string | null) => {
    setFilters((prev) => ({ ...prev, corridorId: id }));
  }, []);

  const setVibe = useCallback((v: string | null) => {
    setFilters((prev) => ({ ...prev, vibe: v }));
  }, []);

  const setSort = useCallback((s: DiscoverSort) => {
    setFilters((prev) => ({ ...prev, sort: s }));
  }, []);

  const setVerifiedOnly = useCallback((v: boolean) => {
    setFilters((prev) => ({ ...prev, verifiedOnly: v }));
  }, []);

  const resetFilters = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setRawSearch("");
    setSearchResults(null);
    setFilters(DEFAULT_DISCOVER_FILTERS);
    setVisibleCount(DISCOVER_PAGE_SIZE);
  }, []);

  // ── Infinite scroll via IntersectionObserver ─────────────────────────────
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + DISCOVER_PAGE_SIZE);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // ── Optimistic follow toggle ─────────────────────────────────────────────
  const toggleFollow = useCallback(
    async (id: string) => {
      const wasFollowing = followedIds.has(id);
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        if (wasFollowing) await unfollowNganya(id);
        else await followNganya(id);
        await router.invalidate();
      } catch {
        // Revert optimistic update on failure.
        setFollowedIds((prev) => {
          const next = new Set(prev);
          if (wasFollowing) next.add(id);
          else next.delete(id);
          return next;
        });
        showErrorToast("Failed to update follow.");
      }
    },
    [followedIds, router, showErrorToast],
  );

  // ── Derived display values ───────────────────────────────────────────────
  const activeCorridorName = useMemo(
    () => corridors.find((c) => c.id === filters.corridorId)?.name ?? null,
    [corridors, filters.corridorId],
  );

  const resultLabel = useMemo(
    () => buildResultLabel(filters, activeCorridorName),
    [filters, activeCorridorName],
  );

  const isFiltered =
    Boolean(filters.search) ||
    Boolean(filters.corridorId) ||
    Boolean(filters.vibe) ||
    filters.verifiedOnly ||
    filters.sort !== DEFAULT_DISCOVER_FILTERS.sort;

  return {
    rawSearch,
    filters,
    items,
    hasMore,
    isSearching,
    followedIds,
    sentinelRef,
    resultLabel,
    isFiltered,
    totalFilteredCount: allFilteredSorted.length,
    setSearch,
    setCorridorId,
    setVibe,
    setSort,
    setVerifiedOnly,
    resetFilters,
    toggleFollow,
  };
}
