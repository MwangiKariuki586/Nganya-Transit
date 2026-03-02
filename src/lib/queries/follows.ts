import { supabase } from '../supabase'

export async function getMyFollows() {
    const { data, error } = await supabase
        .from('follows')
        .select('*, nganyas(*, corridors(name))')
    if (error) throw error
    return data
}

export async function followNganya(nganyaId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error("Not authenticated")

    const { data, error } = await supabase
        .from('follows')
        .insert({ user_id: session.user.id, nganya_id: nganyaId, notify_live: true })

    if (error) throw error
    return data
}

export async function unfollowNganya(nganyaId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error("Not authenticated")

    const { error } = await supabase
        .from('follows')
        .delete()
        .match({ user_id: session.user.id, nganya_id: nganyaId })

    if (error) throw error
}
