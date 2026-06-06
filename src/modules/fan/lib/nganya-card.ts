import { toNganyaSlug } from "@/lib/formatters";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";
import type { Nganya } from "@/lib/mockData";
import type {
  FanFollowRecord,
  FanLiveNganyaRecord,
  FanNganyaRecord,
} from "./fan-data";

interface MapNganyaRecordToCardDataOptions {
  liveNganyas?: FanLiveNganyaRecord[];
  lastSeen?: string;
  followers?: number;
  sightingsToday?: number;
}

export type FanCardRecord = FanNganyaRecord | FanFollowRecord;
export type FanCardData = Nganya & {
  corridorId?: string | null;
  corridorName?: string | null;
  isVerified?: boolean;
};

export function getNganyaRecordId(
  record: FanCardRecord | null | undefined,
): string | null {
  if (!record) return null;
  const source = (record.nganyas || record) as any;
  return source.nganya_id || source.id || null;
}

export function enrichNganyaImageFields<T extends FanNganyaRecord>(
  record: T | null | undefined,
  fullNganyasById?: Map<string, FanNganyaRecord>,
): T | null | undefined {
  if (!record || !fullNganyasById?.size) return record;

  const id = getNganyaRecordId(record);
  if (!id) return record;

  const full = fullNganyasById.get(id);
  if (!full) return record;

  return {
    ...full,
    ...record,
    nganya_media: full.nganya_media ?? record.nganya_media,
    crew_nganyas: full.crew_nganyas ?? record.crew_nganyas,
    image_url: full.image_url ?? record.image_url,
    profile_photo_url:
      record.profile_photo_url ??
      full.profile_photo_url ??
      pickPrimaryNganyaImageUrl(full) ??
      null,
  };
}

export function mapNganyaRecordToCardData(
  record: FanCardRecord | null | undefined,
  options: MapNganyaRecordToCardDataOptions = {},
): FanCardData | null {
  if (!record) return null;

  const source = (record.nganyas || record) as any;
  const id = getNganyaRecordId(source);
  if (!id) return null;

  const liveNganyas = options.liveNganyas ?? [];
  const isLive =
    liveNganyas.some((live) => getNganyaRecordId(live) === id) ||
    source.status === "LIVE";

  return {
    id,
    slug:
      source.slug ||
      source.nganya_slug ||
      toNganyaSlug(source.nganya_name || source.name),
    name: source.nganya_name || source.name,
    corridorId: source.corridor_id || source.nganyas?.corridor_id || null,
    corridorName:
      source.corridor_name || source.corridors?.name || "Unknown Route",
    corridor: source.corridor_name || source.corridors?.name || "Unknown Route",
    vibeTags: source.vibeTags || source.tags || [],
    imageUrl:
      pickPrimaryNganyaImageUrl(source) ?? source.profile_photo_url ?? "",
    isLive,
    isNewBuild:
      source.tags?.includes("NEW_BUILD") || Boolean(source.is_new_build),
    isVerified: Boolean(source.is_verified),
    followers: options.followers ?? source.follower_count ?? 0,
    sightingsToday: options.sightingsToday ?? source.sighting_count_today ?? 0,
    lastSeen: options.lastSeen ?? source.last_seen ?? "Recently",
    lastSeenMinutes: 0,
    confidence: "high",
    description: source.description || "",
  };
}
