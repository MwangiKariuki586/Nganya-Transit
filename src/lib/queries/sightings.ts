import { supabase } from "../supabase";
import { authRequired } from "@/shared/errors/app-error";

async function attachSightingConfidence<T extends { id: string }>(
  rows: T[] | null,
) {
  const sightings = rows || [];

  if (sightings.length === 0) {
    return sightings.map((row) => ({
      ...row,
      confidence: null,
    }));
  }

  const sightingIds = sightings.map((row) => row.id);
  const { data: confidenceRows, error: confidenceError } = await supabase
    .from("v_sighting_confidence")
    .select("*")
    .in("sighting_id", sightingIds);

  if (confidenceError) throw confidenceError;

  const confidenceBySightingId = new Map(
    (confidenceRows || []).map((row) => [row.sighting_id, row]),
  );

  return sightings.map((row) => ({
    ...row,
    confidence: confidenceBySightingId.get(row.id) || null,
  }));
}

export async function getCorridorSightings(corridorId: string, limit = 50) {
  const { data, error } = await supabase
    .from("sightings")
    .select(
      `
      *, 
      stage:stages(name),
      nganya:nganyas(name, tags, corridors(name)), 
      user:v_public_profiles!sightings_user_id_fkey(handle, avatar_url)
    `,
    )
    .eq("corridor_id", corridorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return attachSightingConfidence(data);
}

export async function getMySightings(limit = 50) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw authRequired();

  const { data, error } = await supabase
    .from("sightings")
    .select(
      `
      *,
      stage:stages(name),
      nganya:nganyas(name, corridors(name))
    `,
    )
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return attachSightingConfidence(data);
}

export async function postSighting(payload: {
  nganya_id: string;
  corridor_id: string;
  stage_id?: string | null;
  location: any; // Requires a PostGIS geometric point string e.g., 'POINT(36.88 -1.21)'
  direction?: string;
  note?: string;
  media_urls?: string[];
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw authRequired();

  const { data, error } = await supabase
    .from("sightings")
    .insert({
      ...payload,
      user_id: session.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function voteOnSighting(
  sightingId: string,
  vote: "SEEN" | "CAP" | "DIFF_ROUTE",
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw authRequired();

  const { data, error } = await supabase.from("sighting_votes").upsert({
    sighting_id: sightingId,
    user_id: session.user.id,
    vote,
  });

  if (error) throw error;
  return data;
}

export function subscribeToSightings(
  corridorId: string,
  callback: (payload: any) => void,
) {
  return supabase
    .channel(`sightings_${corridorId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sightings",
        filter: `corridor_id=eq.${corridorId}`,
      },
      (payload) => callback(payload),
    )
    .subscribe();
}
