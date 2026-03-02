import { supabase } from '../supabase'

/**
 * Fetch all active live sessions for a particular corridor.
 * Connects to the `v_live_now` view in Postgres to guarantee that only 
 * truly active sessions (recently pinged within 90s) are returned.
 */
export async function getLiveNow(corridorId?: string) {
    let query = supabase.from('v_live_now').select('*')

    if (corridorId) {
        query = query.eq('corridor_id', corridorId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
}

/**
 * Set up a Realtime subscription to seamlessly track `live_sessions` for a corridor.
 * Returns the channel so it can be cleanly unsubscribed later.
 */
export function subscribeToLive(corridorId: string, callback: (payload: any) => void) {
    const channel = supabase
        .channel(`live_sessions_${corridorId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'live_sessions',
                filter: `corridor_id=eq.${corridorId}`
            },
            (payload) => callback(payload)
        )
        .subscribe()

    return channel
}
