export interface FanCorridorRecord {
  id: string;
  name: string;
  short_name?: string | null;
  [key: string]: any;
}

export interface FanMediaRecord {
  media_url?: string | null;
  media_type?: string | null;
}

export interface FanCrewNganyaRecord {
  profiles?: {
    avatar_url?: string | null;
    [key: string]: unknown;
  } | null;
}

export interface FanNganyaRelations {
  name?: string | null;
  [key: string]: any;
}

export interface FanNganyaRecord {
  id?: string | null;
  nganya_id?: string | null;
  name?: string | null;
  nganya_name?: string | null;
  slug?: string | null;
  nganya_slug?: string | null;
  corridor_id?: string | null;
  corridor_name?: string | null;
  corridors?: FanNganyaRelations | null;
  tags?: string[] | null;
  vibeTags?: string[] | null;
  nganya_media?: FanMediaRecord[] | null;
  crew_nganyas?: FanCrewNganyaRecord[] | null;
  image_url?: string | null;
  profile_photo_url?: string | null;
  follower_count?: number | null;
  sighting_count_today?: number | null;
  last_seen?: string | null;
  status?: string | null;
  is_new_build?: boolean | null;
  is_verified?: boolean | null;
  created_at?: string | null;
  [key: string]: any;
}

export interface FanLiveNganyaRecord extends FanNganyaRecord {
  nganya_id?: string | null;
  last_ping_at?: string | null;
  direction?: string | null;
}

export interface FanFollowRecord {
  nganya_id: string;
  notify_live?: boolean | null;
  created_at?: string | null;
  nganyas?: FanNganyaRecord | null;
  [key: string]: any;
}

export interface FanSightingStageRecord {
  id?: string | null;
  name?: string | null;
  [key: string]: any;
}

export interface FanSightingNganyaRecord {
  id?: string | null;
  name?: string | null;
  tags?: string[] | null;
  corridors?: FanNganyaRelations | null;
  [key: string]: any;
}

export interface FanSightingUserRecord {
  handle?: string | null;
  avatar_url?: string | null;
  [key: string]: any;
}

export interface FanSightingConfidenceRecord {
  [key: string]: any;
}

export interface FanRecentSightingRecord {
  id: string;
  nganya_id?: string | null;
  corridor_id?: string | null;
  created_at?: string | null;
  direction?: string | null;
  stage_id?: string | null;
  stage?: FanSightingStageRecord | null;
  nganya?: FanSightingNganyaRecord | null;
  user?: FanSightingUserRecord | null;
  confidence?: FanSightingConfidenceRecord | null;
  [key: string]: any;
}
