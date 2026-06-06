import { supabase } from '../supabase'
import { authRequired } from '@/shared/errors/app-error'

export async function getProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) {
        console.error('Error fetching profile:', error)
        return null
    }
    return data
}

export async function getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return getProfile(user.id)
}

export async function getCurrentAuthUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
}

export async function updateCurrentUserProfile(payload: {
    full_name?: string
    handle?: string
    avatar_url?: string
    cover_media_url?: string
    cover_media_type?: 'image' | 'video'
}) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) throw authRequired()

    const updatePayload: Record<string, any> = {}
    if (payload.full_name !== undefined) updatePayload.full_name = payload.full_name.trim() || null
    if (payload.handle !== undefined) updatePayload.handle = payload.handle.replace(/^@+/, '').trim()
    if (payload.avatar_url !== undefined) updatePayload.avatar_url = payload.avatar_url
    if (payload.cover_media_url !== undefined) updatePayload.cover_media_url = payload.cover_media_url
    if (payload.cover_media_type !== undefined) updatePayload.cover_media_type = payload.cover_media_type

    const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single()

    if (error) throw error

    // Keep auth user metadata in sync
    const metaUpdate: Record<string, any> = {}
    if (payload.full_name !== undefined) metaUpdate.full_name = payload.full_name.trim()
    if (payload.handle !== undefined) metaUpdate.handle = payload.handle.replace(/^@+/, '').trim()
    if (Object.keys(metaUpdate).length > 0) {
        const { error: updateUserError } = await supabase.auth.updateUser({ data: metaUpdate })
        if (updateUserError) throw updateUserError
    }

    return data
}
