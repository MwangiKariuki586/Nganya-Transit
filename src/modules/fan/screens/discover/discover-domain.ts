import type { DiscoverFilters, DiscoverSort } from "./discover-types";
import { mapNganyaRecordToCardData } from "@/modules/fan/lib/nganya-card";

/**
 * Maps a raw Supabase nganya row to the shape expected by the Card component.
 * Requires the current liveNganyas list to derive isLive status.
 */
export function mapNganyaToCardProps(dbNganya: any, liveNganyas: any[]): any | null {
  return mapNganyaRecordToCardData(dbNganya, { liveNganyas });
}

/** Sorts a nganyas array in-place by the given DiscoverSort key. Returns new array. */
export function sortNganyas(nganyas: any[], sort: DiscoverSort): any[] {
  const copy = [...nganyas];
  switch (sort) {
    case "trending":
      return copy.sort(
        (a, b) =>
          ((b.follower_count || 0) + (b.sighting_count_today || 0)) -
          ((a.follower_count || 0) + (a.sighting_count_today || 0)),
      );
    case "popular":
      return copy.sort(
        (a, b) => (b.follower_count || 0) - (a.follower_count || 0),
      );
    case "newest":
      return copy.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
    case "active":
      return copy.sort(
        (a, b) =>
          (b.sighting_count_today || 0) - (a.sighting_count_today || 0),
      );
    default:
      return copy;
  }
}

/**
 * Builds a contextual result label from active filters.
 * Examples: "Trending in Kasarani", "Bass-heavy on Rongai", "Verified nganyas"
 */
export function buildResultLabel(
  filters: DiscoverFilters,
  corridorName: string | null,
): string {
  const { sort, vibe, verifiedOnly, search } = filters;

  if (search) return `Results for "${search}"`;

  const vibeLabel = vibe
    ? vibe.replace(/_/g, " ").toLowerCase()
    : null;

  if (verifiedOnly) {
    if (corridorName) return `Verified on ${corridorName}`;
    return "Verified nganyas";
  }

  if (sort === "trending") {
    if (vibeLabel && corridorName) return `${vibeLabel} on ${corridorName}`;
    if (corridorName) return `Trending in ${corridorName}`;
    if (vibeLabel) return `Trending · ${vibeLabel}`;
    return "Trending nganyas";
  }

  if (sort === "newest") {
    if (corridorName) return `Newest on ${corridorName}`;
    return "Newest nganyas";
  }

  if (sort === "popular") {
    if (corridorName) return `Most followed on ${corridorName}`;
    return "Most followed";
  }

  if (sort === "active") {
    if (corridorName) return `Recently active on ${corridorName}`;
    return "Recently active";
  }

  return "All nganyas";
}
