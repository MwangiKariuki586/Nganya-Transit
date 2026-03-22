import { normalizeRole } from '@/shared/auth/roles'
import type { AppRole } from '@/shared/types/rbac'
import { getUserScopedSupabaseClient } from '@/server/supabase/user-client.server'

export type CrewDirection = 'TO_TOWN' | 'FROM_TOWN'
export type CrewSeatsPreset = 10 | 5 | 2 | 0

export interface CrewAccessContext {
  accessToken: string
  supabase: ReturnType<typeof getUserScopedSupabaseClient>
  userId: string
  role: AppRole
}

function validateAccessToken(accessToken: string | null | undefined) {
  if (!accessToken) {
    throw new Error('AUTH_REQUIRED')
  }
}

export async function requireCrewAccess(accessToken: string): Promise<CrewAccessContext> {
  validateAccessToken(accessToken)

  const supabase = getUserScopedSupabaseClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    throw new Error('AUTH_REQUIRED')
  }

  let role = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role)

  if (!role) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    role = normalizeRole(profile?.role)
  }

  if (!role || !['crew', 'admin'].includes(role)) {
    throw new Error('FORBIDDEN')
  }

  return {
    accessToken,
    supabase,
    userId: user.id,
    role,
  }
}

export async function listMappedNganyas(context: CrewAccessContext, corridorId?: string | null) {
  let query = (context.supabase.from('crew_nganyas') as any).select(`
    nganya_id,
    nganyas(
      id,
      name,
      corridor_id,
      tags,
      is_verified,
      created_at,
      corridors(name),
      nganya_media(media_url, media_type)
    )
  `)

  if (context.role !== 'admin') {
    query = query.eq('crew_user_id', context.userId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const mappedNganyas = (data || [])
    .map((row: any) => row.nganyas)
    .filter(Boolean)

  if (!corridorId) return mappedNganyas

  return mappedNganyas.filter((nganya: any) => nganya.corridor_id === corridorId)
}

export async function assertMappedNganya(context: CrewAccessContext, nganyaId: string) {
  if (context.role === 'admin') return

  const { data, error } = await (context.supabase.from('crew_nganyas') as any)
    .select('nganya_id')
    .eq('crew_user_id', context.userId)
    .eq('nganya_id', nganyaId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('NOT_MAPPED')
  }
}

export async function getActiveCrewSession(context: CrewAccessContext) {
  let query = (context.supabase.from('live_sessions') as any)
    .select(`
      *,
      nganyas(name, corridor_id, corridors(name), nganya_media(media_url, media_type))
    `)
    .eq('status', 'LIVE')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)

  if (context.role !== 'admin') {
    query = query.eq('crew_user_id', context.userId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

export async function getCrewSessionById(context: CrewAccessContext, sessionId: string) {
  let query = (context.supabase.from('live_sessions') as any)
    .select(`
      *,
      nganyas(name, corridor_id, corridors(name), nganya_media(media_url, media_type))
    `)
    .eq('id', sessionId)

  if (context.role !== 'admin') {
    query = query.eq('crew_user_id', context.userId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('SESSION_NOT_FOUND')
  }

  return data
}

export async function listCrewSessionHistory(context: CrewAccessContext, limit: number = 12) {
  let query = (context.supabase.from('live_sessions') as any)
    .select(`
      *,
      nganyas(name, corridor_id, corridors(name))
    `)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (context.role !== 'admin') {
    query = query.eq('crew_user_id', context.userId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}
