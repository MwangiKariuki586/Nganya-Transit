import { supabase } from '../supabase'

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
    full_name: string
    handle: string
}) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!user) throw new Error('Not authenticated')

    const normalizedHandle = payload.handle.replace(/^@+/, '').trim()

    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: payload.full_name.trim() || null,
            handle: normalizedHandle,
        })
        .select()
        .single()

    if (error) throw error

    const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
            full_name: payload.full_name.trim(),
            handle: normalizedHandle,
        },
    })

    if (updateUserError) throw updateUserError

    return data
}
