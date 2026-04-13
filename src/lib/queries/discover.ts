import { supabase } from '../supabase'
import { toNganyaSlug } from '../formatters'

function dedupeNganyas<T extends { id: string; nganya_media?: any[] }>(rows: T[] | null) {
    const items = rows || []
    const byId = new Map<string, T>()

    for (const row of items) {
        const existing = byId.get(row.id)
        if (!existing) {
            byId.set(row.id, row)
            continue
        }

        const mergedMedia = [
            ...(existing.nganya_media || []),
            ...(row.nganya_media || []),
        ].filter((media, index, list) => {
            const key = `${media?.media_url || ''}:${media?.media_type || ''}`
            return index === list.findIndex((item) => `${item?.media_url || ''}:${item?.media_type || ''}` === key)
        })

        byId.set(row.id, {
            ...existing,
            ...row,
            nganya_media: mergedMedia,
        })
    }

    return Array.from(byId.values())
}

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
    return dedupeNganyas(data)
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

export async function getNganyaBySlug(slug: string) {
    const { data, error } = await supabase
        .from('nganyas')
        .select('*, corridors(*), nganya_media(*)')
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).find((nganya) => toNganyaSlug(nganya.name) === slug) || null
}

export async function getNganyasByCorridor(corridorId: string, excludeNganyaId?: string) {
    let query = supabase
        .from('nganyas')
        .select('*, corridors(*), nganya_media(*)')
        .eq('corridor_id', corridorId)
        .order('created_at', { ascending: false })

    if (excludeNganyaId) {
        query = query.neq('id', excludeNganyaId)
    }

    const { data, error } = await query.limit(4)
    if (error) throw error
    return dedupeNganyas(data)
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

export async function searchNganyaJourney(params: {
    corridorId: string
    pickupStageId: string
    preferredNganyaId?: string | null
    vibeTags?: string[] | null
    maxResults?: number
}) {
    const {
        corridorId,
        pickupStageId,
        preferredNganyaId,
        vibeTags,
        maxResults = 12
    } = params

    // Preferred corridor-first contract.
    const v2 = await supabase.rpc('search_nganyas_v2', {
        p_corridor_id: corridorId,
        p_pickup_stage_id: pickupStageId,
        p_preferred_nganya_id: preferredNganyaId || null,
        p_vibe_tags: vibeTags || null,
        p_max_results: maxResults
    })

    if (!v2.error) return v2.data

    // Backward-compatible fallback for older environments.
    const legacy = await supabase.rpc('search_nganyas', {
        p_pickup_stage_id: pickupStageId,
        p_destination_place_id: corridorId,
        p_preferred_nganya_id: preferredNganyaId || null,
        p_vibe_tags: vibeTags || null,
        p_max_results: maxResults
    })

    if (legacy.error) throw legacy.error
    return legacy.data
}

export async function getStages(corridorId?: string) {
    let query = supabase.from('stages').select('*').order('name')
    if (corridorId) {
        query = query.eq('corridor_id', corridorId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
}

export async function getPlaces() {
    const { data, error } = await supabase.from('places').select('*').order('name')
    if (error) throw error
    return data
}

export async function getNganyaMediaPaginated(nganyaId: string, page: number = 0, pageSize: number = 10) {
    const from = page * pageSize
    const to = from + pageSize - 1

    const { data, error } = await supabase
        .from('nganya_media')
        .select('id, media_url, media_type, nganya_id')
        .eq('nganya_id', nganyaId)
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error
    return data || []
}
