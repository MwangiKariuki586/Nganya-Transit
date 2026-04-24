export type DiscoverSort = "trending" | "newest" | "popular" | "active";

export interface DiscoverFilters {
  search: string;
  corridorId: string | null;
  vibe: string | null;
  sort: DiscoverSort;
  verifiedOnly: boolean;
}

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  search: "",
  corridorId: null,
  vibe: null,
  sort: "trending",
  verifiedOnly: false,
};

export const DISCOVER_PAGE_SIZE = 12;

export const SORT_OPTIONS: { key: DiscoverSort; label: string }[] = [
  { key: "trending", label: "Trending" },
  { key: "newest", label: "Newest" },
  { key: "popular", label: "Most followed" },
  { key: "active", label: "Recently active" },
];
