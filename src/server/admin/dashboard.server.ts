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
import { authRequired, forbidden, validationError, appError } from '@/shared/errors/app-error'

function assertAdminRole(role: string | null | undefined) {
  if (normalizeRole(role) !== 'admin') {
    throw forbidden()
  }
}

function requireAccessToken(accessToken: string | null | undefined) {
  if (!accessToken) {
    throw authRequired()
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
    throw authRequired()
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

async function listAllAuthUsers(maxUsers = 2000) {
  const supabase = getServiceRoleSupabaseClient()
  const perPage = 200
  let page = 1
  const users: any[] = []

  while (users.length < maxUsers) {
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

  const [
    { count: totalUsers, error: totalUsersError },
    { count: totalFans, error: fansError },
    { count: totalCrew, error: crewError },
    { count: totalAdmins, error: adminsError },
    { count: pendingCount, error: pendingError },
    { count: needsInfoCount, error: needsInfoError },
    { data: activeSessions, error: sessionsError },
    { count: crewMappingCount, error: mappingsError },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'fan'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'crew'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('nganya_registration_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('nganya_registration_requests').select('id', { count: 'exact', head: true }).eq('status', 'NEEDS_INFO'),
    supabase.from('live_sessions').select('id, last_ping_at').eq('status', 'LIVE'),
    supabase.from('crew_nganyas').select('crew_user_id', { count: 'exact', head: true }),
  ])

  if (totalUsersError) throw totalUsersError
  if (fansError) throw fansError
  if (crewError) throw crewError
  if (adminsError) throw adminsError
  if (pendingError) throw pendingError
  if (needsInfoError) throw needsInfoError
  if (sessionsError) throw sessionsError
  if (mappingsError) throw mappingsError

  const nowMs = Date.now()
  const staleLiveSessions = (activeSessions || []).filter((session) => {
    const lastPingMs = Date.parse(session.last_ping_at)
    return Number.isFinite(lastPingMs) && nowMs - lastPingMs > 90_000
  }).length

  const crewWithoutAssignment = (totalCrew || 0) - (crewMappingCount || 0)

  return {
    totalUsers: totalUsers || 0,
    totalFans: totalFans || 0,
    totalCrew: totalCrew || 0,
    totalAdmins: totalAdmins || 0,
    pendingRegistrations: pendingCount || 0,
    needsInfoRegistrations: needsInfoCount || 0,
    activeLiveSessions: activeSessions?.length || 0,
    staleLiveSessions,
    crewWithoutAssignment: Math.max(0, crewWithoutAssignment),
    roleMismatches: 0,
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

  const { error } = await supabase
    .from('crew_nganyas')
    .upsert(
      {
        crew_user_id: input.crewUserId,
        nganya_id: input.nganyaId,
      },
      { onConflict: 'crew_user_id' },
    )

  if (error) throw error

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
  actorUserId: string,
  role: string | null | undefined,
  input: { userId: string; role: AppRole },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()
  const { data: existingUserData, error: existingUserError } = await supabase.auth.admin.getUserById(input.userId)
  if (existingUserError) throw existingUserError

  // Capture old role for audit
  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', input.userId)
    .single()

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

  // Log action
  await logAdminAction({
    actorUserId,
    actionType: 'SET_ROLE',
    targetUserId: input.userId,
    payload: {
      oldRole: oldProfile?.role,
      newRole: input.role,
    },
  })

  return { ok: true }
}

async function logAdminAction(input: {
  actorUserId: string
  actionType: string
  targetUserId?: string
  targetResourceId?: string
  payload?: any
  note?: string
}) {
  const supabase = getServiceRoleSupabaseClient()
  
  const { error } = await (supabase.from('admin_actions') as any).insert({
    actor_user_id: input.actorUserId,
    action_type: input.actionType,
    target_user_id: input.targetUserId || null,
    target_resource_id: input.targetResourceId || null,
    payload: input.payload || null,
    note: input.note || null,
  })

  if (error) {
    throw appError('UNKNOWN', 'Failed to log admin action — operation aborted for auditability', { cause: error })
  }
}

export async function getUserDetailWithAudit(
  role: string | null | undefined,
  input: { userId: string },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()

  // Get user details
  const [
    { data: authUser, error: authError },
    { data: profile, error: profileError },
    { data: userRole, error: userRoleError },
    { data: crewMapping, error: crewError },
    { data: auditLogs, error: auditError },
  ] = await Promise.all([
    supabase.auth.admin.getUserById(input.userId),
    supabase.from('profiles').select('*').eq('id', input.userId).maybeSingle(),
    (supabase.from('user_roles') as any).select('role').eq('user_id', input.userId).maybeSingle(),
    (supabase.from('crew_nganyas') as any)
      .select('nganya_id, nganyas(id, name, corridors(name))')
      .eq('crew_user_id', input.userId)
      .maybeSingle(),
    (supabase.from('admin_actions') as any)
      .select('id, created_at, action_type, payload, note, actor:actor_user_id(id, email)')
      .eq('target_user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (authError) throw authError
  if (profileError) throw profileError
  if (userRoleError) throw userRoleError

  const profileRole = normalizeRole(profile?.role) ?? null
  const userRoleValue = normalizeRole(userRole?.role) ?? null
  const authRole =
    normalizeRole(authUser.user?.app_metadata?.role) ??
    normalizeRole(authUser.user?.user_metadata?.role) ??
    null

  return {
    id: input.userId,
    email: authUser.user?.email ?? null,
    handle: profile?.handle ?? null,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    profileRole,
    userRole: userRoleValue,
    authRole,
    createdAt: profile?.created_at ?? authUser.user?.created_at ?? null,
    lastSignInAt: authUser.user?.last_sign_in_at ?? null,
    roleMismatch: Boolean(
      (profileRole && userRoleValue && profileRole !== userRoleValue) ||
        (profileRole && authRole && profileRole !== authRole) ||
        (userRoleValue && authRole && userRoleValue !== authRole),
    ),
    crewAssignment: crewMapping
      ? {
          nganyaId: crewMapping.nganya_id,
          nganyaName: (crewMapping.nganyas as any)?.name ?? null,
          corridorName: (crewMapping.nganyas as any)?.corridors?.name ?? null,
        }
      : null,
    auditLogs: (auditLogs || []).map((log: any) => ({
      id: log.id,
      createdAt: log.created_at,
      actionType: log.action_type,
      payload: log.payload,
      note: log.note,
      actorEmail: log.actor?.email ?? 'Unknown',
    })),
  }
}

export async function fixRoleMismatch(
  actorUserId: string,
  role: string | null | undefined,
  input: { userId: string; targetRole: AppRole },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()

  // Get current state
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(input.userId)
  if (authError) throw authError

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', input.userId)
    .single()

  const { data: userRole } = await (supabase.from('user_roles') as any)
    .select('role')
    .eq('user_id', input.userId)
    .maybeSingle()

  const oldState = {
    profileRole: normalizeRole(profile?.role),
    userRole: normalizeRole(userRole?.role),
    authRole:
      normalizeRole(authUser.user?.app_metadata?.role) ??
      normalizeRole(authUser.user?.user_metadata?.role),
  }

  // Update all sources to target role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: input.targetRole })
    .eq('id', input.userId)

  if (profileError) throw profileError

  const { error: userRoleError } = await (supabase.from('user_roles') as any).upsert(
    {
      user_id: input.userId,
      role: input.targetRole,
    },
    {
      onConflict: 'user_id',
    },
  )

  if (userRoleError) throw userRoleError

  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(input.userId, {
    app_metadata: {
      ...(authUser.user?.app_metadata ?? {}),
      role: input.targetRole,
    },
    user_metadata: {
      ...(authUser.user?.user_metadata ?? {}),
      role: input.targetRole,
      intent: input.targetRole,
    },
  })

  if (authUpdateError) throw authUpdateError

  // Log action
  await logAdminAction({
    actorUserId,
    actionType: 'FIX_MISMATCH',
    targetUserId: input.userId,
    payload: {
      oldState,
      newRole: input.targetRole,
    },
  })

  return {
    ok: true,
    warnings: ['User must re-login for auth claim changes to take effect'],
    changes: {
      profile: oldState.profileRole !== input.targetRole,
      userRoles: oldState.userRole !== input.targetRole,
      authClaim: oldState.authRole !== input.targetRole,
    },
  }
}

export async function forceUserSignout(
  actorUserId: string,
  role: string | null | undefined,
  input: { userId: string; reason?: string },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()

  // Sign out user by revoking all sessions
  const { error } = await supabase.auth.admin.signOut(input.userId)

  if (error) throw error

  // Log action
  await logAdminAction({
    actorUserId,
    actionType: 'FORCE_SIGNOUT',
    targetUserId: input.userId,
    payload: { reason: input.reason },
    note: input.reason,
  })

  return { ok: true }
}

export async function suspendUser(
  actorUserId: string,
  role: string | null | undefined,
  input: { userId: string; reason: string },
) {
  assertAdminRole(role)

  if (!input.reason || input.reason.trim().length < 10) {
    throw validationError('Suspension reason must be at least 10 characters')
  }

  const supabase = getServiceRoleSupabaseClient()

  // Ban the user indefinitely (Supabase Admin API)
  const { error } = await supabase.auth.admin.updateUserById(input.userId, {
    ban_duration: '876000h',
  })

  if (error) throw error

  // Log action
  await logAdminAction({
    actorUserId,
    actionType: 'SUSPEND_USER',
    targetUserId: input.userId,
    payload: { reason: input.reason },
    note: input.reason,
  })

  return { ok: true }
}

export async function deleteUser(
  actorUserId: string,
  role: string | null | undefined,
  input: { userId: string; reason: string },
) {
  assertAdminRole(role)

  if (!input.reason || input.reason.trim().length < 20) {
    throw validationError('Deletion reason must be at least 20 characters')
  }

  const supabase = getServiceRoleSupabaseClient()

  // Prevent self-deletion
  if (actorUserId === input.userId) {
    throw validationError('Cannot delete your own account')
  }

  // Get user info before deletion for audit
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, handle, role')
    .eq('id', input.userId)
    .single()

  // Log action BEFORE deletion (so we can still reference the user)
  await logAdminAction({
    actorUserId,
    actionType: 'DELETE_USER',
    targetUserId: input.userId,
    payload: {
      reason: input.reason,
      deletedUser: profile,
    },
    note: input.reason,
  })

  // Delete user via Supabase Admin API
  const { error } = await supabase.auth.admin.deleteUser(input.userId)

  if (error) throw error

  return { ok: true }
}

export async function terminateCrewSession(
  actorUserId: string,
  role: string | null | undefined,
  input: { sessionId: string; reason?: string },
) {
  assertAdminRole(role)

  const supabase = getServiceRoleSupabaseClient()

  // Verify session exists and is active
  const { data: session, error: fetchError } = await (supabase.from('live_sessions') as any)
    .select('id, status, crew_user_id')
    .eq('id', input.sessionId)
    .single()

  if (fetchError) throw fetchError
  if (!session) throw appError('SESSION_NOT_FOUND')

  // Terminate the session
  const { error: updateError } = await (supabase.from('live_sessions') as any)
    .update({
      status: 'OFF',
      ended_at: new Date().toISOString(),
      last_ping_at: new Date().toISOString(),
      admin_terminated: true,
      admin_termination_reason: input.reason || 'Admin terminated',
    })
    .eq('id', input.sessionId)

  if (updateError) throw updateError

  // Log action
  await logAdminAction({
    actorUserId,
    actionType: 'TERMINATE_SESSION',
    targetUserId: session.crew_user_id,
    targetResourceId: input.sessionId,
    payload: { reason: input.reason },
    note: input.reason,
  })

  return { ok: true, sessionId: input.sessionId }
}
