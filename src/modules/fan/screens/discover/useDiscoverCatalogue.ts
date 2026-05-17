import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useToast } from "@/components/ui/ToastContainer";
import { followNganya, unfollowNganya } from "@/lib/queries/follows";
import {
  loadDiscoverCataloguePage,
  type DiscoverCorridorSummary,
} from "@/modules/fan/services/route-data";
import {
  buildResultLabel,
  mapNganyaToCardProps,
} from "./discover-domain";
import {
  DEFAULT_DISCOVER_FILTERS,
  DISCOVER_PAGE_SIZE,
  type DiscoverFilters,
  type DiscoverSort,
} from "./discover-types";

const SEARCH_DEBOUNCE_MS = 300;

interface UseDiscoverCatalogueOptions {
  initialNganyas: any[];
  initialHasMore: boolean;
  initialNextOffset: number;
  totalCount: number;
  initialFollowedIds: Set<string>;
  liveNganyas: any[];
  corridors: DiscoverCorridorSummary[];
  initialCorridorId?: string | null;
}

export function useDiscoverCatalogue({
  initialNganyas,
  initialHasMore,
  initialNextOffset,
  totalCount,
  initialFollowedIds,
  liveNganyas,
  corridors,
  initialCorridorId = null,
}: UseDiscoverCatalogueOptions) {
  const { showErrorToast } = useToast();

  const [filters, setFilters] = useState<DiscoverFilters>(() => ({
    ...DEFAULT_DISCOVER_FILTERS,
    corridorId: initialCorridorId,
  }));
  const [rawSearch, setRawSearch] = useState("");
  const [queryState, setQueryState] = useState(() => ({
    items: initialNganyas,
    hasMore: initialHasMore,
    nextOffset: initialNextOffset,
    totalCount,
  }));
  const [isSearching, setIsSearching] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(initialFollowedIds);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);

  const items = useMemo(
    () =>
      queryState.items
        .map((n) => mapNganyaToCardProps(n, liveNganyas))
        .filter(Boolean),
    [queryState.items, liveNganyas],
  );

  const runPageQuery = useCallback(
    async (
      nextFilters: DiscoverFilters,
      options?: { append?: boolean; offset?: number },
    ) => {
      const seq = ++requestSeqRef.current;
      setIsSearching(true);

      try {
        const page = await loadDiscoverCataloguePage({
          search: nextFilters.search,
          corridorId: nextFilters.corridorId,
          vibe: nextFilters.vibe,
          sort: nextFilters.sort,
          verifiedOnly: nextFilters.verifiedOnly,
          offset: options?.offset ?? 0,
          limit: DISCOVER_PAGE_SIZE,
        });

        if (requestSeqRef.current !== seq) return;

        setQueryState((current) => ({
          items: options?.append ? [...current.items, ...page.nganyas] : page.nganyas,
          hasMore: page.hasMore,
          nextOffset: page.nextOffset,
          totalCount: page.totalCount,
        }));
      } catch {
        if (requestSeqRef.current !== seq) return;
        showErrorToast("Search failed. Try again.");
      } finally {
        if (requestSeqRef.current === seq) {
          setIsSearching(false);
        }
      }
    },
    [showErrorToast],
  );

  useEffect(() => {
    if (
      filters.search === "" &&
      filters.corridorId === initialCorridorId &&
      filters.vibe === null &&
      filters.sort === DEFAULT_DISCOVER_FILTERS.sort &&
      !filters.verifiedOnly
    ) {
      setQueryState({
        items: initialNganyas,
        hasMore: initialHasMore,
        nextOffset: initialNextOffset,
        totalCount,
      });
      setIsSearching(false);
      return;
    }

    void runPageQuery(filters);
  }, [
    filters,
    initialHasMore,
    initialNextOffset,
    initialNganyas,
    initialCorridorId,
    runPageQuery,
    totalCount,
  ]);

  const setSearch = useCallback((value: string) => {
    setRawSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!value.trim()) {
      setFilters((prev) => ({ ...prev, search: "" }));
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value.trim() }));
    }, SEARCH_DEBOUNCE_MS);
  }, []);

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
    setFilters(DEFAULT_DISCOVER_FILTERS);
  }, []);

  const loadMore = useCallback(() => {
    if (isSearching || !queryState.hasMore) return;
    void runPageQuery(filters, {
      append: true,
      offset: queryState.nextOffset,
    });
  }, [filters, isSearching, queryState.hasMore, queryState.nextOffset, runPageQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !queryState.hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, queryState.hasMore]);

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
      } catch {
        setFollowedIds((prev) => {
          const next = new Set(prev);
          if (wasFollowing) next.add(id);
          else next.delete(id);
          return next;
        });
        showErrorToast("Failed to update follow.");
      }
    },
    [followedIds, showErrorToast],
  );

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
    hasMore: queryState.hasMore,
    isSearching,
    followedIds,
    sentinelRef,
    resultLabel,
    isFiltered,
    totalFilteredCount: queryState.totalCount,
    setSearch,
    setCorridorId,
    setVibe,
    setSort,
    setVerifiedOnly,
    resetFilters,
    toggleFollow,
  };
}
