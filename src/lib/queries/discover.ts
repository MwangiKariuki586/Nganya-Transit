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

export async function createNganya(nganyaData: {
    name: string
    corridor_id: string
    tags?: string[]
    imageUrl?: string
}) {
    const { name, corridor_id, tags, imageUrl } = nganyaData

    // 1. Insert Nganya
    // We attempt to get the current user session to tag the creator
    const { data: { user } } = await supabase.auth.getUser()

    // Casting to any to avoid strict type mismatch with generated types in certain environments
    const { data: nganya, error: nganyaError } = await (supabase
        .from('nganyas') as any)
        .insert({
            name,
            corridor_id,
            tags: tags || null,
            is_verified: false,
            created_by: user?.id || null
        })
        .select()
        .single()

    if (nganyaError) throw nganyaError

    // 2. Insert Media if provided
    if (imageUrl && nganya) {
        const { error: mediaError } = await (supabase
            .from('nganya_media') as any)
            .insert({
                nganya_id: nganya.id,
                media_url: imageUrl,
                media_type: 'image'
            })

        if (mediaError) throw mediaError
    }

    return nganya
}
