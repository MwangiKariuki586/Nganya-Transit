import { getUserScopedSupabaseClient } from '@/server/supabase/user-client.server'
import { appError, authRequired, validationError } from '@/shared/errors/app-error'
import { getRequestAccessToken } from '@/server/auth/session.server'

export interface UpdateProfileInput {
  full_name?: string
  handle?: string
  bio?: string
  avatar_url?: string
  cover_media_url?: string
  cover_media_type?: 'image' | 'video'
  cover_poster_url?: string
}

const PROFILE_SELECT =
  'id, handle, full_name, avatar_url, bio, role, created_at, updated_at, cover_media_url, cover_media_type, cover_poster_url'

function isProfileNotFoundError(error: unknown) {
  const code = typeof error === 'object' && error ? (error as { code?: string }).code : undefined
  return code === 'PGRST116'
}

function normalizeProfileRecord(record: Record<string, any>) {
  return {
    ...record,
    cover_media_url: record.cover_media_url ?? null,
    cover_media_type: record.cover_media_type ?? null,
    cover_poster_url: record.cover_poster_url ?? null,
  }
}

async function fetchProfileRecord(supabase: ReturnType<typeof getUserScopedSupabaseClient>, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .single()

  if (error) {
    if (isProfileNotFoundError(error)) {
      throw authRequired('Profile not found')
    }
    throw appError('UNKNOWN', 'Failed to load crew profile', { cause: error })
  }

  return normalizeProfileRecord(data)
}

async function updateProfileRecord(
  supabase: ReturnType<typeof getUserScopedSupabaseClient>,
  userId: string,
  updates: Record<string, any>,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single()

  if (error) {
    throw error
  }

  return normalizeProfileRecord(data)
}

function validateAccessToken(accessToken: string | null): asserts accessToken is string {
  if (!accessToken) {
    throw authRequired('Authentication required to update profile')
  }
}

function validateProfileInput(input: UpdateProfileInput) {
  // Validate handle
  if (input.handle !== undefined) {
    if (input.handle.length < 3) {
      throw validationError('Handle must be at least 3 characters long')
    }
    if (input.handle.length > 30) {
      throw validationError('Handle must be at most 30 characters long')
    }
    if (!/^[a-zA-Z0-9_]+$/.test(input.handle)) {
      throw validationError('Handle can only contain letters, numbers, and underscores')
    }
  }

  // Validate full_name
  if (input.full_name !== undefined) {
    if (input.full_name.length > 100) {
      throw validationError('Display name must be at most 100 characters long')
    }
  }

  // Validate bio
  if (input.bio !== undefined) {
    if (input.bio.length > 500) {
      throw validationError('Bio must be at most 500 characters long')
    }
  }
}

export async function updateCrewProfileWithToken(accessToken: string, input: UpdateProfileInput) {
  return updateCrewProfile(null, input, accessToken)
}

export async function updateCrewProfile(request: Request | null, input: UpdateProfileInput, tokenOverride?: string) {
  const accessToken = tokenOverride ?? getRequestAccessToken(request)
  validateAccessToken(accessToken)
  validateProfileInput(input)

  const supabase = getUserScopedSupabaseClient(accessToken)

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw authRequired('Invalid authentication')
  }

  // Build update object with only provided fields
  const updates: Record<string, any> = {}
  if (input.full_name !== undefined) updates.full_name = input.full_name
  if (input.handle !== undefined) updates.handle = input.handle
  if (input.bio !== undefined) updates.bio = input.bio
  if (input.avatar_url !== undefined) updates.avatar_url = input.avatar_url
  if (input.cover_media_url !== undefined) updates.cover_media_url = input.cover_media_url
  if (input.cover_media_type !== undefined) updates.cover_media_type = input.cover_media_type
  if (input.cover_poster_url !== undefined) updates.cover_poster_url = input.cover_poster_url

  // Check if handle is already taken (if being updated)
  if (input.handle !== undefined) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', input.handle)
      .neq('id', user.id)
      .single()

    if (existingProfile) {
      throw validationError('Handle is already taken')
    }
  }

  // Update profile
  try {
    return await updateProfileRecord(supabase, user.id, updates)
  } catch (error) {
    console.error('Profile update error:', error)
    throw validationError('Failed to update profile')
  }
}

export async function getCrewProfile(request: Request | null) {
  const accessToken = getRequestAccessToken(request)
  validateAccessToken(accessToken)

  const supabase = getUserScopedSupabaseClient(accessToken)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw authRequired('Invalid authentication')
  }

  try {
    return await fetchProfileRecord(supabase, user.id)
  } catch (error) {
    console.error('Profile fetch error:', error)
    throw error
  }
}

