import { getServiceRoleSupabaseClient } from '@/server/supabase/service-role.server'
import { getUserScopedSupabaseClient } from '@/server/supabase/user-client.server'
import { normalizeRole } from '@/shared/auth/roles'
import type {
  AdminCrewRecord,
  AdminNganyaOption,
  AdminOverviewStats,
  AdminUserRecord,
} from '@/shared/types/admin-dashboard'
import type { AppRole } from '@/shared/types/rbac'

function assertAdminRole(role: string | null | undefined) {
  if (normalizeRole(role) !== 'admin') {
    throw new Error('FORBIDDEN')
  }
}

function requireAccessToken(accessToken: string | null | undefined) {
  if (!accessToken) {
    throw new Error('AUTH_REQUIRED')
  }
}

export async function requireAdminDashboardAccess(accessToken: string) {
  requireAccessToken(accessToken)

  const supabase = getUserScopedSupabaseClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    throw new Error('AUTH_REQUIRED')
  }

  let role =
    normalizeRole(user.app_metadata?.role) ??
    normalizeRole(user.user_metadata?.role)

  if (!role) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    role = normalizeRole(profile?.role)
  }

  assertAdminRole(role)

  return {
    userId: user.id,
    role,
  }
}

async function listAllAuthUsers() {
  const supabase = getServiceRoleSupabaseClient()
  const perPage = 200
  let page = 1
  const users: any[] = []

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) throw error

    const batch = data?.users || []
    users.push(...batch)

    if (batch.length < perPage) break
    page += 1
  }

  return users
}

async function loadProfileRoleMaps() {
  const supabase = getServiceRoleSupabaseClient()

  const [{ data: profiles, error: profilesError }, { data: userRoles, error: userRolesError }] =
    await Promise.all([
      supabase.from('profiles').select('id, handle, full_name, avatar_url, role, created_at'),
      (supabase.from('user_roles') as any).select('user_id, role'),
    ])

  if (profilesError) throw profilesError
  if (userRolesError) throw userRolesError

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
  const userRoleMap = new Map(
    ((userRoles || []) as any[]).map((row) => [row.user_id, normalizeRole(row.role)]),
  )

  return {
    profiles: profiles || [],
    profileMap,
    userRoleMap,
  }
}

export async function getAdminOverview(role: string | null | undefined): Promise<AdminOverviewStats> {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()
  const authUsers = await listAllAuthUsers()
  const { profiles, userRoleMap } = await loadProfileRoleMaps()

  const [{ count: pendingCount, error: pendingError }, { count: needsInfoCount, error: needsInfoError }, { data: activeSessions, error: sessionsError }, { data: crewMappings, error: mappingsError }] =
    await Promise.all([
      supabase.from('nganya_registration_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('nganya_registration_requests').select('id', { count: 'exact', head: true }).eq('status', 'NEEDS_INFO'),
      supabase.from('live_sessions').select('id, last_ping_at').eq('status', 'LIVE'),
      supabase.from('crew_nganyas').select('crew_user_id'),
    ])

  if (pendingError) throw pendingError
  if (needsInfoError) throw needsInfoError
  if (sessionsError) throw sessionsError
  if (mappingsError) throw mappingsError

  const nowMs = Date.now()
  const staleLiveSessions = (activeSessions || []).filter((session) => {
    const lastPingMs = Date.parse(session.last_ping_at)
    return Number.isFinite(lastPingMs) && nowMs - lastPingMs > 90_000
  }).length

  const crewIds = profiles.filter((profile) => profile.role === 'crew').map((profile) => profile.id)
  const mappedCrewIds = new Set((crewMappings || []).map((mapping) => mapping.crew_user_id))

  const roleMismatches = authUsers.filter((user) => {
    const profileRole = normalizeRole(profiles.find((profile) => profile.id === user.id)?.role)
    const userRole = userRoleMap.get(user.id) ?? null
    const authRole =
      normalizeRole(user.app_metadata?.role) ??
      normalizeRole(user.user_metadata?.role)

    return Boolean(
      (profileRole && userRole && profileRole !== userRole) ||
        (profileRole && authRole && profileRole !== authRole) ||
        (userRole && authRole && userRole !== authRole),
    )
  }).length

  return {
    totalUsers: authUsers.length,
    totalFans: profiles.filter((profile) => profile.role === 'fan').length,
    totalCrew: crewIds.length,
    totalAdmins: profiles.filter((profile) => profile.role === 'admin').length,
    pendingRegistrations: pendingCount || 0,
    needsInfoRegistrations: needsInfoCount || 0,
    activeLiveSessions: activeSessions?.length || 0,
    staleLiveSessions,
    crewWithoutAssignment: crewIds.filter((id) => !mappedCrewIds.has(id)).length,
    roleMismatches,
  }
}

export async function listAdminUsers(role: string | null | undefined): Promise<AdminUserRecord[]> {
  assertAdminRole(role)

  const authUsers = await listAllAuthUsers()
  const { profileMap, userRoleMap } = await loadProfileRoleMaps()

  return authUsers
    .map((user) => {
      const profile = profileMap.get(user.id)
      const profileRole = normalizeRole(profile?.role) ?? null
      const userRole = userRoleMap.get(user.id) ?? null
      const authRole =
        normalizeRole(user.app_metadata?.role) ??
        normalizeRole(user.user_metadata?.role) ??
        null

      return {
        id: user.id,
        email: user.email ?? null,
        handle: profile?.handle ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        profileRole,
        userRole,
        authRole,
        createdAt: profile?.created_at ?? user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        roleMismatch: Boolean(
          (profileRole && userRole && profileRole !== userRole) ||
            (profileRole && authRole && profileRole !== authRole) ||
            (userRole && authRole && userRole !== authRole),
        ),
      } satisfies AdminUserRecord
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || '')
      const rightTime = Date.parse(right.createdAt || '')
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
    })
}

export async function listAdminCrew(role: string | null | undefined): Promise<AdminCrewRecord[]> {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()
  const authUsers = await listAllAuthUsers()
  const { profiles } = await loadProfileRoleMaps()

  const crewProfiles = profiles.filter((profile) => profile.role === 'crew')
  const crewIds = crewProfiles.map((profile) => profile.id)

  const [
    { data: mappings, error: mappingsError },
    { data: requests, error: requestsError },
    { data: activeSessions, error: sessionsError },
  ] = await Promise.all([
    (supabase.from('crew_nganyas') as any).select(`
      crew_user_id,
      nganya_id,
      nganyas(id, name, is_verified, corridors(name))
    `),
    supabase
      .from('nganya_registration_requests')
      .select('id, created_by, status, updated_at')
      .in('created_by', crewIds.length ? crewIds : ['00000000-0000-0000-0000-000000000000'])
      .order('updated_at', { ascending: false }),
    supabase
      .from('live_sessions')
      .select('id, crew_user_id, started_at, last_ping_at')
      .eq('status', 'LIVE')
      .in('crew_user_id', crewIds.length ? crewIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  if (mappingsError) throw mappingsError
  if (requestsError) throw requestsError
  if (sessionsError) throw sessionsError

  const authUserMap = new Map(authUsers.map((user) => [user.id, user]))
  const mappingMap = new Map<string, any>()
  const latestRequestMap = new Map<string, any>()
  const activeSessionMap = new Map<string, any>()

  for (const mapping of (mappings || []) as any[]) {
    mappingMap.set(mapping.crew_user_id, mapping)
  }

  for (const request of requests || []) {
    if (!latestRequestMap.has(request.created_by)) {
      latestRequestMap.set(request.created_by, request)
    }
  }

  for (const session of activeSessions || []) {
    activeSessionMap.set(session.crew_user_id, session)
  }

  return crewProfiles.map((profile) => {
    const authUser = authUserMap.get(profile.id)
    const mapping = mappingMap.get(profile.id)
    const request = latestRequestMap.get(profile.id)
    const session = activeSessionMap.get(profile.id)

    return {
      id: profile.id,
      email: authUser?.email ?? null,
      handle: profile.handle ?? null,
      fullName: profile.full_name ?? null,
      profileRole: normalizeRole(profile.role) ?? null,
      assignedNganyaId: mapping?.nganya_id ?? null,
      assignedNganyaName: mapping?.nganyas?.name ?? null,
      assignedCorridorName: mapping?.nganyas?.corridors?.name ?? null,
      assignmentVerified: Boolean(mapping?.nganyas?.is_verified),
      latestRequestId: request?.id ?? null,
      latestRequestStatus: request?.status ?? null,
      latestRequestUpdatedAt: request?.updated_at ?? null,
      activeSessionId: session?.id ?? null,
      activeSessionStartedAt: session?.started_at ?? null,
      activeSessionLastPingAt: session?.last_ping_at ?? null,
    } satisfies AdminCrewRecord
  })
}

export async function listAdminNganyaOptions(role: string | null | undefined): Promise<AdminNganyaOption[]> {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()
  const { data, error } = await (supabase.from('nganyas') as any)
    .select(`
      id,
      name,
      corridor_id,
      is_verified,
      corridors(name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error

  return ((data || []) as any[]).map((nganya) => ({
    id: nganya.id,
    name: nganya.name,
    corridorId: nganya.corridor_id,
    corridorName: nganya.corridors?.name || 'Unknown corridor',
    isVerified: Boolean(nganya.is_verified),
  }))
}

export async function assignCrewNganya(
  role: string | null | undefined,
  input: { crewUserId: string; nganyaId: string },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()

  const { error: deleteError } = await supabase
    .from('crew_nganyas')
    .delete()
    .eq('crew_user_id', input.crewUserId)

  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from('crew_nganyas')
    .insert({
      crew_user_id: input.crewUserId,
      nganya_id: input.nganyaId,
    })

  if (insertError) throw insertError

  return { ok: true }
}

export async function unassignCrewNganya(
  role: string | null | undefined,
  input: { crewUserId: string },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()
  const { error } = await supabase
    .from('crew_nganyas')
    .delete()
    .eq('crew_user_id', input.crewUserId)

  if (error) throw error

  return { ok: true }
}

export function getSuggestedRole(record: Pick<AdminUserRecord, 'profileRole' | 'userRole' | 'authRole'>): AppRole {
  return record.profileRole ?? record.userRole ?? record.authRole ?? 'fan'
}

export async function updateAdminUserRole(
  role: string | null | undefined,
  input: { userId: string; role: AppRole },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()
  const { data: existingUserData, error: existingUserError } = await supabase.auth.admin.getUserById(input.userId)
  if (existingUserError) throw existingUserError

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: input.role })
    .eq('id', input.userId)

  if (profileError) throw profileError

  const { error: userRoleError } = await (supabase.from('user_roles') as any).upsert(
    {
      user_id: input.userId,
      role: input.role,
    },
    {
      onConflict: 'user_id',
    },
  )

  if (userRoleError) throw userRoleError

  const { error: authError } = await supabase.auth.admin.updateUserById(input.userId, {
    app_metadata: {
      ...(existingUserData.user?.app_metadata ?? {}),
      role: input.role,
    },
    user_metadata: {
      ...(existingUserData.user?.user_metadata ?? {}),
      role: input.role,
      intent: input.role,
    },
  })

  if (authError) throw authError

  return { ok: true }
}
