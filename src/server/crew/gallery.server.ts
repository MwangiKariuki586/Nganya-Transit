import { getUserScopedSupabaseClient } from '@/server/supabase/user-client.server'
import { getServiceRoleSupabaseClient } from '@/server/supabase/service-role.server'
import { authRequired, appError } from '@/shared/errors/app-error'
import { getRequestAccessToken } from '@/server/auth/session.server'

const GALLERY_LIMIT = 30

export async function getProfileGallery(userId: string) {
  const supabase = getServiceRoleSupabaseClient()

  const { data, error } = await supabase
    .from('profile_media')
    .select('id, media_url, media_type, storage_path, sort_order, created_at')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(GALLERY_LIMIT)

  if (error) throw appError('UNKNOWN', 'Failed to load gallery', { cause: error })
  return data ?? []
}

export async function addGalleryItem(
  request: Request | null,
  input: { media_url: string; media_type: 'image' | 'video'; storage_path: string },
  tokenOverride?: string,
) {
  const accessToken = tokenOverride ?? getRequestAccessToken(request)
  if (!accessToken) throw authRequired('Authentication required')

  const supabase = getUserScopedSupabaseClient(accessToken)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw authRequired('Invalid authentication')

  // Check limit
  const { count } = await supabase
    .from('profile_media')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) >= GALLERY_LIMIT) {
    throw appError('VALIDATION_ERROR', `Gallery is full. Maximum ${GALLERY_LIMIT} items allowed.`)
  }

  // Get current max sort_order
  const { data: last } = await supabase
    .from('profile_media')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sort_order = (last?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('profile_media')
    .insert({ user_id: user.id, ...input, sort_order })
    .select('id, media_url, media_type, storage_path, sort_order, created_at')
    .single()

  if (error) throw appError('UNKNOWN', 'Failed to save gallery item', { cause: error })
  return data
}

export async function deleteGalleryItem(
  request: Request | null,
  itemId: string,
  tokenOverride?: string,
) {
  const accessToken = tokenOverride ?? getRequestAccessToken(request)
  if (!accessToken) throw authRequired('Authentication required')

  const supabase = getUserScopedSupabaseClient(accessToken)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw authRequired('Invalid authentication')

  // Fetch item first to get storage_path and verify ownership
  const { data: item, error: fetchError } = await supabase
    .from('profile_media')
    .select('id, storage_path')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !item) throw appError('NOT_FOUND', 'Gallery item not found')

  const { error } = await supabase
    .from('profile_media')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id)

  if (error) throw appError('UNKNOWN', 'Failed to delete gallery item', { cause: error })

  return { storage_path: item.storage_path }
}

/**
 * Fetches profile_media items uploaded by the crew member(s) assigned to a
 * given nganya, via the crew_nganyas join table.
 * This is used to surface crew-uploaded photos on the public nganya detail page.
 */
export async function getNganyaCrewGallery(nganyaId: string) {
  const supabase = getServiceRoleSupabaseClient()

  // Find the crew user(s) assigned to this nganya
  const { data: mappings, error: mappingError } = await (supabase
    .from('crew_nganyas') as any)
    .select('crew_user_id')
    .eq('nganya_id', nganyaId)

  if (mappingError) throw appError('UNKNOWN', 'Failed to load crew mapping', { cause: mappingError })
  if (!mappings || mappings.length === 0) return []

  const crewUserIds = mappings.map((m: { crew_user_id: string }) => m.crew_user_id)

  const { data, error } = await supabase
    .from('profile_media')
    .select('id, media_url, media_type, created_at')
    .in('user_id', crewUserIds)
    .order('created_at', { ascending: false })
    .limit(GALLERY_LIMIT)

  if (error) throw appError('UNKNOWN', 'Failed to load crew gallery', { cause: error })
  return data ?? []
}

/**
 * Fetches the crew member's profile (avatar + cover) for a given nganya,
 * via the crew_nganyas join table. Used to render the correct images on
 * the public nganya detail page.
 */
export async function getNganyaCrewProfile(nganyaId: string) {
  const supabase = getServiceRoleSupabaseClient()

  const { data, error } = await (supabase
    .from('crew_nganyas') as any)
    .select('crew_user_id, profiles(id, avatar_url, cover_media_url, cover_media_type, full_name, handle)')
    .eq('nganya_id', nganyaId)
    .maybeSingle()

  if (error) throw appError('UNKNOWN', 'Failed to load crew profile', { cause: error })
  if (!data) return null

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  return profile ? { ...profile, id: data.crew_user_id } : null
}
