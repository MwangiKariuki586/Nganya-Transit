/** Confidence level produced by the search_nganyas_v2 RPC. */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** Data source for an individual result row. */
export type JourneySource = 'LIVE' | 'SIGHTING';

/**
 * A single result returned by searchNganyaJourney / search_nganyas_v2.
 * Derived from observed RPC field usage across SearchResultsOverlayV2
 * and TrackDrawer.
 */
export interface JourneyResult {
  nganya_id: string;
  nganya_name: string;
  corridor_id: string;
  corridor_name: string;
  tags: string[] | null;
  eta_minutes: number;
  confidence_level: ConfidenceLevel;
  source: JourneySource;
  last_seen_at: string | null;
  /** Public URL when search or map pin supplies crew/media photo */
  profile_photo_url?: string | null;
}
