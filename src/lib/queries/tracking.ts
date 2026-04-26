/**
 * Tracking queries — position lookups and feedback persistence.
 *
 * Position data lives in PostGIS geography columns (live_sessions.last_location,
 * sightings.location, stages.location). Supabase returns these as GeoJSON objects
 * when selected via the JS client.
 *
 * Note: The project's database.types.ts has incomplete column-level typings for
 * several tables (same `never` issue as sightings.ts, discover.ts, etc.). We use
 * a minimal `(supabase as any).from(...)` cast — identical pattern to how
 * `(supabase.rpc as CallableFunction)` is used throughout the project.
 */

import { supabase } from '../supabase'
import type { TrackingPosition } from '../types/tracking'

/** Cast the Supabase client to `any` to work around incomplete generated types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (client: unknown): any => client

// ─── PostGIS helpers ─────────────────────────────────────────────────────────

/**
 * Decode PostGIS EWKB hex (e.g. geography over the wire from PostgREST / Realtime).
 * Handles 2D Point with optional SRID (PostGIS extended flags 0x20000000).
 */
function parseEwkbPointHex(hex: string): TrackingPosition | null {
  const s = hex.trim()
  if (!/^[0-9a-fA-F]+$/.test(s) || s.length < 42) return null
  const bytes = new Uint8Array(s.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
  const le = bytes[0] === 1
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u32 = (o: number) => (le ? dv.getUint32(o, true) : dv.getUint32(o, false))
  const f64 = (o: number) => (le ? dv.getFloat64(o, true) : dv.getFloat64(o, false))
  let o = 1
  const wkbType = u32(o)
  o += 4
  const baseType = wkbType & 0xff
  const hasSrid = (wkbType & 0x20000000) !== 0
  if (baseType !== 1) return null // WKBPoint only
  if (hasSrid) o += 4
  const lng = f64(o)
  o += 8
  const lat = f64(o)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** WKT: POINT(lng lat) or SRID=4326;POINT(lng lat) */
function parseWktPoint(wkt: string): TrackingPosition | null {
  const m = wkt.trim().match(/POINT\s*\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/i)
  if (!m) return null
  const lng = Number(m[1])
  const lat = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * Parse a PostGIS geography column value into a plain lat/lng.
 * Supabase may return:
 *   - GeoJSON object { type: "Point", coordinates: [lng, lat] }
 *   - JSON string of the above
 *   - EWKB hex string (common for geography in some clients / Realtime)
 *   - WKT "POINT(lng lat)" or "SRID=4326;POINT(...)"
 * Exported for use in Realtime payload parsing (avoids extra HTTP round-trip).
 */
export function parsePostgisPoint(location: unknown): TrackingPosition | null {
  if (location == null) return null
  try {
    if (typeof location === 'string') {
      const t = location.trim()
      if (t.startsWith('{')) {
        return parsePostgisPoint(JSON.parse(t) as unknown)
      }
      if (/^[0-9a-fA-F]+$/.test(t)) {
        const fromHex = parseEwkbPointHex(t)
        if (fromHex) return fromHex
      }
      const stripped = t.replace(/^SRID=\d+;\s*/i, '')
      const fromWkt = parseWktPoint(stripped)
      if (fromWkt) return fromWkt
      return null
    }

    const loc = location as { type?: string; coordinates?: [number, number] }
    if (loc.type === 'Point' && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
      const [lng, lat] = loc.coordinates
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    }
    const alt = location as { lat?: number; lng?: number; latitude?: number; longitude?: number }
    const lat = alt.lat ?? alt.latitude
    const lng = alt.lng ?? alt.longitude
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat: lat!, lng: lng! }
  } catch {
    // Silently ignore unparseable values
  }
  return null
}

// ─── Corridor map pins (LIVE crew GPS + latest sighting per nganya) ───────────

export type CorridorMapPinSource = 'LIVE' | 'SIGHTING'

export interface CorridorNganyaMapPin {
  nganya_id: string
  nganya_name: string
  /** Cover: first nganya image, else crew avatar */
  profile_photo_url: string | null
  position: TrackingPosition
  /** Crew ping vs fan sighting — LIVE wins when both exist */
  pin_source: CorridorMapPinSource
  /** last_ping_at (LIVE) or sighting created_at (SIGHTING), ISO string */
  observed_at: string
}

/**
 * Every nganya on this corridor that has a mappable point:
 * 1) LIVE session with last_location (newest ping per nganya)
 * 2) Else latest sighting with location (per nganya), only if no LIVE pin
 */
export async function fetchCorridorNganyaMapPins(
  corridorId: string,
): Promise<CorridorNganyaMapPin[]> {
  const q = db(supabase)

  const { data: sessions, error: errLive } = await q
    .from('live_sessions')
    .select('nganya_id, last_location, last_ping_at')
    .eq('corridor_id', corridorId)
    .eq('status', 'LIVE')
    .not('last_location', 'is', null)
    .order('last_ping_at', { ascending: false })

  if (errLive) throw errLive

  const pins = new Map<string, CorridorNganyaMapPin>()
  for (const row of (sessions ?? []) as Array<{
    nganya_id: string
    last_location: unknown
    last_ping_at: string
  }>) {
    if (pins.has(row.nganya_id)) continue
    const position = parsePostgisPoint(row.last_location)
    if (!position) continue
    pins.set(row.nganya_id, {
      nganya_id: row.nganya_id,
      nganya_name: '',
      profile_photo_url: null,
      position,
      pin_source: 'LIVE',
      observed_at: row.last_ping_at,
    })
  }

  const { data: sightings, error: errSight } = await q
    .from('sightings')
    .select('nganya_id, location, created_at')
    .eq('corridor_id', corridorId)
    .not('location', 'is', null)
    .order('created_at', { ascending: false })

  if (errSight) throw errSight

  for (const row of (sightings ?? []) as Array<{
    nganya_id: string
    location: unknown
    created_at: string
  }>) {
    if (pins.has(row.nganya_id)) continue
    const position = parsePostgisPoint(row.location)
    if (!position) continue
    pins.set(row.nganya_id, {
      nganya_id: row.nganya_id,
      nganya_name: '',
      profile_photo_url: null,
      position,
      pin_source: 'SIGHTING',
      observed_at: row.created_at,
    })
  }

  if (pins.size === 0) return []

  const ids = [...pins.keys()]
  const { data: nganyas, error: errNg } = await q
    .from('nganyas')
    .select(
      'id, name, nganya_media(media_url, media_type), crew_nganyas(is_active, profiles(avatar_url))',
    )
    .in('id', ids)

  if (errNg) throw errNg

  type NgRow = {
    id: string
    name: string
    nganya_media?: Array<{ media_url: string; media_type: string }> | null
    crew_nganyas?: Array<{
      is_active?: boolean | null
      profiles?: { avatar_url?: string | null } | null
    }> | null
  }

  const byId = new Map(
    ((nganyas ?? []) as NgRow[]).map((n) => [n.id, n]),
  )

  function resolveProfilePhoto(row: NgRow): string | null {
    const media = row.nganya_media ?? []
    const img = media.find((m) => m.media_type === 'image' && m.media_url)
    if (img?.media_url) return img.media_url
    const anyUrl = media.find((m) => m.media_url)
    if (anyUrl?.media_url) return anyUrl.media_url
    const crew = row.crew_nganyas ?? []
    const active = crew.find(
      (c) => c?.is_active !== false && c?.profiles?.avatar_url,
    )
    if (active?.profiles?.avatar_url) return active.profiles.avatar_url
    const anyAv = crew.find((c) => c?.profiles?.avatar_url)
    return anyAv?.profiles?.avatar_url ?? null
  }

  return [...pins.values()].map((pin) => {
    const row = byId.get(pin.nganya_id)
    return {
      ...pin,
      nganya_name: row?.name ?? 'Nganya',
      profile_photo_url: row ? resolveProfilePhoto(row) : null,
    }
  })
}

// ─── Position lookups ────────────────────────────────────────────────────────

/**
 * Fetch current nganya position.
 * Priority: active live session last_location → latest sighting location.
 */
export async function fetchNganyaPosition(nganyaId: string): Promise<TrackingPosition | null> {
  const q = db(supabase)

  // 1. Active live session
  const { data: live } = await q
    .from('live_sessions')
    .select('last_location')
    .eq('nganya_id', nganyaId)
    .eq('status', 'LIVE')
    .order('last_ping_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (live?.last_location) {
    const pos = parsePostgisPoint(live.last_location)
    if (pos) return pos
  }

  // 2. Latest sighting with a location
  const { data: sighting } = await q
    .from('sightings')
    .select('location')
    .eq('nganya_id', nganyaId)
    .not('location', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return sighting?.location ? parsePostgisPoint(sighting.location) : null
}

/**
 * Fetch pickup stage geographic position.
 */
export async function fetchStagePosition(stageId: string): Promise<TrackingPosition | null> {
  const { data } = await db(supabase)
    .from('stages')
    .select('location')
    .eq('id', stageId)
    .maybeSingle()

  return data?.location ? parsePostgisPoint(data.location) : null
}

/**
 * Fetch multiple stage positions in one query.
 * Returns a map of stageId → position.
 */
export async function fetchStagePositions(
  stageIds: string[],
): Promise<Map<string, TrackingPosition>> {
  if (stageIds.length === 0) return new Map()

  const { data } = await db(supabase)
    .from('stages')
    .select('id, location')
    .in('id', stageIds)

  const map = new Map<string, TrackingPosition>()
  for (const row of (data ?? []) as Array<{ id: string; location: unknown }>) {
    const pos = parsePostgisPoint(row.location)
    if (pos) map.set(row.id, pos)
  }
  return map
}

// ─── Feedback persistence ────────────────────────────────────────────────────

/**
 * Record a boarded/missed outcome for this tracking session.
 *
 * BOARDED confirmations validate recent ETA accuracy.
 * MISSED  confirmations flag over-optimistic ETAs for future calibration.
 *
 * TODO: replace with a dedicated `tracking_feedback` table + RPC when available.
 */
export async function postTrackingFeedback(params: {
  action: 'BOARDED' | 'MISSED'
  nganya_id: string
  corridor_id: string
  stage_id: string
  eta_was: number
  user_position?: TrackingPosition | null
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) return // Not logged in — skip silently

  const locationWKT = params.user_position
    ? `POINT(${params.user_position.lng} ${params.user_position.lat})`
    : 'POINT(0 0)'

  const { error } = await db(supabase).from('sightings').insert({
    nganya_id: params.nganya_id,
    corridor_id: params.corridor_id,
    stage_id: params.stage_id,
    user_id: session.user.id,
    location: locationWKT,
    note: `${params.action}_CONFIRM:eta_was=${params.eta_was}`,
  })

  if (error) {
    console.warn('[tracking] feedback post failed:', error.message)
  }
}
