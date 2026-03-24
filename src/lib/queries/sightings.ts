import { supabase } from '../supabase'

export async function getCorridorSightings(corridorId: string) {
    // Join on public.v_public_profiles to only expose allowed viewer data instead of raw full profiles table.
    // Join on v_sighting_confidence to retrieve aggregated scoring metrics based on votes.
    const { data, error } = await supabase
        .from('sightings')
        .select(`
      *, 
      nganya:nganyas(name, tags), 
      user:v_public_profiles!sightings_user_id_fkey(handle, avatar_url), 
      confidence:v_sighting_confidence(*)
    `)
        .eq('corridor_id', corridorId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function getMySightings() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error("Not authenticated")

    const { data, error } = await supabase
        .from('sightings')
        .select(`
      *,
      stage:stages(name),
      nganya:nganyas(name, corridors(name)),
      confidence:v_sighting_confidence(*)
    `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function postSighting(payload: {
    nganya_id: string;
    corridor_id: string;
    location: any; // Requires a PostGIS geometric point string e.g., 'POINT(36.88 -1.21)'
    direction?: string;
    note?: string;
    media_urls?: string[];
}) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error("Not authenticated")

    const { data, error } = await supabase
        .from('sightings')
        .insert({
            ...payload,
            user_id: session.user.id
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function voteOnSighting(sightingId: string, vote: 'SEEN' | 'CAP' | 'DIFF_ROUTE') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error("Not authenticated")

    const { data, error } = await supabase
        .from('sighting_votes')
        .upsert({
            sighting_id: sightingId,
            user_id: session.user.id,
            vote
        })

    if (error) throw error
    return data
}

export function subscribeToSightings(corridorId: string, callback: (payload: any) => void) {
    return supabase
        .channel(`sightings_${corridorId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'sightings',
                filter: `corridor_id=eq.${corridorId}`
            },
            (payload) => callback(payload)
        )
        .subscribe()
}
