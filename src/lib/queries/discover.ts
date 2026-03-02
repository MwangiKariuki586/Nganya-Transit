import { supabase } from '../supabase'

export async function getCorridors() {
    const { data, error } = await supabase.from('corridors').select('*')
    if (error) throw error
    return data
}

export async function searchNganyas(queryText: string, corridorId?: string) {
    let query = supabase.from('nganyas').select('*, corridors(name), nganya_media(media_url, media_type)')

    if (corridorId) {
        query = query.eq('corridor_id', corridorId)
    }

    if (queryText) {
        // Basic ilike search on name or tags for MVP
        query = query.or(`name.ilike.%${queryText}%,tags.cs.{${queryText}}`)
    }

    const { data, error } = await query
    if (error) throw error
    return data
}

export async function getNganya(id: string) {
    const { data, error } = await supabase
        .from('nganyas')
        .select('*, corridors(*), nganya_media(*)')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}
