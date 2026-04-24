import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Chainable query builder mock ──────────────────────────────────

function chainable(terminal: Record<string, vi.Mock> = {}) {
  const chain: Record<string, vi.Mock> = {}

  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'in',
    'maybeSingle',
    'single',
    'order',
    'limit',
  ]

  for (const method of methods) {
    chain[method] = terminal[method] ?? vi.fn(() => chain)
  }

  return chain
}

// ── Service-role mock surface ─────────────────────────────────────

const listUsers = vi.fn()
const getUserById = vi.fn()
const updateUserById = vi.fn()
const deleteUserFn = vi.fn()
const signOut = vi.fn()

const serviceFrom = vi.fn()

const serviceRoleClient = {
  auth: {
    admin: {
      listUsers,
      getUserById,
      updateUserById,
      deleteUser: deleteUserFn,
      signOut,
    },
  },
  from: serviceFrom,
}

vi.mock('@/server/supabase/service-role.server', () => ({
  getServiceRoleSupabaseClient: vi.fn(() => serviceRoleClient),
}))

// ── User-scoped mock surface ──────────────────────────────────────

const userGetUser = vi.fn()
const userFrom = vi.fn()

vi.mock('@/server/supabase/user-client.server', () => ({
  getUserScopedSupabaseClient: vi.fn(() => ({
    auth: { getUser: userGetUser },
    from: userFrom,
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────

function makeAdminAuthUser(overrides: Record<string, any> = {}) {
  return {
    id: 'admin-001',
    email: 'admin@test.com',
    app_metadata: { role: 'admin' },
    user_metadata: { role: 'admin' },
    ...overrides,
  }
}

function stubServiceFrom(tableName: string, terminal: Record<string, vi.Mock> = {}) {
  const chain = chainable(terminal)
  serviceFrom.mockImplementation((table: string) => {
    if (table === tableName) return chain
    return chainable()
  })
  return chain
}

// ── Tests ─────────────────────────────────────────────────────────

describe('requireAdminDashboardAccess', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns userId and role for a valid admin', async () => {
    userGetUser.mockResolvedValue({
      data: {
        user: makeAdminAuthUser(),
      },
      error: null,
    })

    const { requireAdminDashboardAccess } = await import(
      '@/server/admin/dashboard.server'
    )

    const result = await requireAdminDashboardAccess('valid-token')
    expect(result).toEqual({ userId: 'admin-001', role: 'admin' })
  })

  it('throws AUTH_REQUIRED when accessToken is falsy', async () => {
    const { requireAdminDashboardAccess } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(requireAdminDashboardAccess('')).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    })
  })

  it('throws AUTH_REQUIRED when getUser returns an error', async () => {
    userGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid token'),
    })

    const { requireAdminDashboardAccess } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      requireAdminDashboardAccess('bad-token'),
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  it('throws FORBIDDEN when user role is not admin', async () => {
    userGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-fan',
          app_metadata: { role: 'fan' },
          user_metadata: { role: 'fan' },
        },
      },
      error: null,
    })

    const { requireAdminDashboardAccess } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      requireAdminDashboardAccess('fan-token'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('falls back to profiles table when auth metadata has no role', async () => {
    userGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'admin-002',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    })

    const profileChain = chainable({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      }),
    })
    userFrom.mockReturnValue(profileChain)

    const { requireAdminDashboardAccess } = await import(
      '@/server/admin/dashboard.server'
    )

    const result = await requireAdminDashboardAccess('token-no-meta')
    expect(result).toEqual({ userId: 'admin-002', role: 'admin' })
  })

  it('throws FORBIDDEN when profiles table also returns non-admin role', async () => {
    userGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-crew',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    })

    const profileChain = chainable({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { role: 'crew' },
        error: null,
      }),
    })
    userFrom.mockReturnValue(profileChain)

    const { requireAdminDashboardAccess } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      requireAdminDashboardAccess('crew-token'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('suspendUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('bans user with 876000h duration and logs the action', async () => {
    updateUserById.mockResolvedValue({ data: {}, error: null })

    const adminActionsChain = chainable({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    serviceFrom.mockImplementation((table: string) => {
      if (table === 'admin_actions') return adminActionsChain
      return chainable()
    })

    const { suspendUser } = await import('@/server/admin/dashboard.server')
    const result = await suspendUser('actor-admin', 'admin', {
      userId: 'target-user',
      reason: 'Violating community guidelines repeatedly',
    })

    expect(result).toEqual({ ok: true })
    expect(updateUserById).toHaveBeenCalledWith('target-user', {
      ban_duration: '876000h',
    })
    expect(adminActionsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: 'actor-admin',
        action_type: 'SUSPEND_USER',
        target_user_id: 'target-user',
      }),
    )
  })

  it('throws FORBIDDEN when caller is not admin', async () => {
    const { suspendUser } = await import('@/server/admin/dashboard.server')

    await expect(
      suspendUser('actor', 'fan', {
        userId: 'target',
        reason: 'Some valid reason text here',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws VALIDATION_ERROR when reason is too short', async () => {
    const { suspendUser } = await import('@/server/admin/dashboard.server')

    await expect(
      suspendUser('actor', 'admin', {
        userId: 'target',
        reason: 'short',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws when Supabase ban API fails', async () => {
    updateUserById.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    })

    const { suspendUser } = await import('@/server/admin/dashboard.server')

    await expect(
      suspendUser('actor', 'admin', {
        userId: 'missing-user',
        reason: 'Violating community guidelines repeatedly',
      }),
    ).rejects.toMatchObject({ message: 'User not found' })
  })
})

describe('assignCrewNganya', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('upserts the crew-nganya mapping on conflict crew_user_id', async () => {
    const crewChain = chainable({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })
    serviceFrom.mockImplementation((table: string) => {
      if (table === 'crew_nganyas') return crewChain
      return chainable()
    })

    const { assignCrewNganya } = await import(
      '@/server/admin/dashboard.server'
    )

    const result = await assignCrewNganya('admin', {
      crewUserId: 'crew-1',
      nganyaId: 'nganya-1',
    })

    expect(result).toEqual({ ok: true })
    expect(crewChain.upsert).toHaveBeenCalledWith(
      { crew_user_id: 'crew-1', nganya_id: 'nganya-1' },
      { onConflict: 'crew_user_id' },
    )
  })

  it('throws FORBIDDEN when caller is not admin', async () => {
    const { assignCrewNganya } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      assignCrewNganya('crew', {
        crewUserId: 'crew-1',
        nganyaId: 'nganya-1',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws when the upsert fails', async () => {
    const crewChain = chainable({
      upsert: vi.fn().mockResolvedValue({
        error: { message: 'FK violation' },
      }),
    })
    serviceFrom.mockImplementation((table: string) => {
      if (table === 'crew_nganyas') return crewChain
      return chainable()
    })

    const { assignCrewNganya } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      assignCrewNganya('admin', {
        crewUserId: 'crew-1',
        nganyaId: 'bad-nganya',
      }),
    ).rejects.toMatchObject({ message: 'FK violation' })
  })
})

describe('unassignCrewNganya', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('deletes the mapping for the given crew user', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null })
    const deleteFn = vi.fn(() => ({ eq: eqFn }))
    const crewChain = chainable({ delete: deleteFn })

    serviceFrom.mockImplementation((table: string) => {
      if (table === 'crew_nganyas') return crewChain
      return chainable()
    })

    const { unassignCrewNganya } = await import(
      '@/server/admin/dashboard.server'
    )

    const result = await unassignCrewNganya('admin', {
      crewUserId: 'crew-1',
    })
    expect(result).toEqual({ ok: true })
    expect(eqFn).toHaveBeenCalledWith('crew_user_id', 'crew-1')
  })
})

describe('updateAdminUserRole', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('updates profile, user_roles, auth metadata, and logs the action', async () => {
    getUserById.mockResolvedValue({
      data: {
        user: {
          id: 'target-user',
          app_metadata: { role: 'fan' },
          user_metadata: { role: 'fan' },
        },
      },
      error: null,
    })
    updateUserById.mockResolvedValue({ data: {}, error: null })

    const profileUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const profileSelectSingle = vi
      .fn()
      .mockResolvedValue({ data: { role: 'fan' }, error: null })
    const userRolesUpsert = vi.fn().mockResolvedValue({ error: null })
    const adminActionsInsert = vi.fn().mockResolvedValue({ error: null })

    serviceFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: profileSelectSingle })),
          })),
          update: vi.fn(() => ({ eq: profileUpdateEq })),
        }
      }
      if (table === 'user_roles') {
        return { upsert: userRolesUpsert }
      }
      if (table === 'admin_actions') {
        return { insert: adminActionsInsert }
      }
      return chainable()
    })

    const { updateAdminUserRole } = await import(
      '@/server/admin/dashboard.server'
    )

    const result = await updateAdminUserRole('actor-admin', 'admin', {
      userId: 'target-user',
      role: 'crew',
    })

    expect(result).toEqual({ ok: true })

    expect(profileUpdateEq).toHaveBeenCalledWith('id', 'target-user')
    expect(userRolesUpsert).toHaveBeenCalledWith(
      { user_id: 'target-user', role: 'crew' },
      { onConflict: 'user_id' },
    )
    expect(updateUserById).toHaveBeenCalledWith(
      'target-user',
      expect.objectContaining({
        app_metadata: expect.objectContaining({ role: 'crew' }),
        user_metadata: expect.objectContaining({ role: 'crew', intent: 'crew' }),
      }),
    )
    expect(adminActionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'SET_ROLE',
        payload: { oldRole: 'fan', newRole: 'crew' },
      }),
    )
  })

  it('throws FORBIDDEN for non-admin callers', async () => {
    const { updateAdminUserRole } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      updateAdminUserRole('actor', 'fan', {
        userId: 'target',
        role: 'crew',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws when getUserById fails', async () => {
    getUserById.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    })

    const { updateAdminUserRole } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      updateAdminUserRole('actor', 'admin', {
        userId: 'ghost',
        role: 'crew',
      }),
    ).rejects.toMatchObject({ message: 'not found' })
  })
})

describe('logAdminAction (via suspendUser)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('throws UNKNOWN when admin_actions insert fails (fail-closed)', async () => {
    updateUserById.mockResolvedValue({ data: {}, error: null })

    const adminActionsChain = chainable({
      insert: vi.fn().mockResolvedValue({
        error: { message: 'DB write failed' },
      }),
    })
    serviceFrom.mockImplementation((table: string) => {
      if (table === 'admin_actions') return adminActionsChain
      return chainable()
    })

    const { suspendUser } = await import('@/server/admin/dashboard.server')

    await expect(
      suspendUser('actor', 'admin', {
        userId: 'target',
        reason: 'Repeated spam and harassment of other users',
      }),
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: expect.stringContaining('audit'),
    })
  })
})

describe('forceUserSignout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('revokes all sessions and logs the action', async () => {
    signOut.mockResolvedValue({ error: null })

    const adminActionsChain = chainable({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    serviceFrom.mockImplementation((table: string) => {
      if (table === 'admin_actions') return adminActionsChain
      return chainable()
    })

    const { forceUserSignout } = await import(
      '@/server/admin/dashboard.server'
    )

    const result = await forceUserSignout('actor-admin', 'admin', {
      userId: 'target-user',
      reason: 'Account compromised',
    })

    expect(result).toEqual({ ok: true })
    expect(signOut).toHaveBeenCalledWith('target-user')
    expect(adminActionsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'FORCE_SIGNOUT',
        target_user_id: 'target-user',
        note: 'Account compromised',
      }),
    )
  })

  it('throws when signOut API fails', async () => {
    signOut.mockResolvedValue({
      error: { message: 'Session revocation failed' },
    })

    const { forceUserSignout } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      forceUserSignout('actor', 'admin', { userId: 'target' }),
    ).rejects.toMatchObject({ message: 'Session revocation failed' })
  })
})

describe('deleteUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('logs before deletion and then deletes the user', async () => {
    const profileSelectSingle = vi.fn().mockResolvedValue({
      data: { email: 'victim@test.com', handle: 'victim', role: 'fan' },
      error: null,
    })
    const adminActionsInsert = vi.fn().mockResolvedValue({ error: null })

    serviceFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: profileSelectSingle })),
          })),
        }
      }
      if (table === 'admin_actions') {
        return { insert: adminActionsInsert }
      }
      return chainable()
    })

    deleteUserFn.mockResolvedValue({ data: {}, error: null })

    const { deleteUser } = await import('@/server/admin/dashboard.server')

    const result = await deleteUser('actor-admin', 'admin', {
      userId: 'target-user',
      reason: 'This account was created fraudulently and must be removed',
    })

    expect(result).toEqual({ ok: true })
    expect(adminActionsInsert).toHaveBeenCalled()
    expect(deleteUserFn).toHaveBeenCalledWith('target-user')
  })

  it('throws VALIDATION_ERROR when reason is under 20 chars', async () => {
    const { deleteUser } = await import('@/server/admin/dashboard.server')

    await expect(
      deleteUser('actor', 'admin', {
        userId: 'target',
        reason: 'too short',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('prevents self-deletion', async () => {
    const { deleteUser } = await import('@/server/admin/dashboard.server')

    await expect(
      deleteUser('actor-admin', 'admin', {
        userId: 'actor-admin',
        reason: 'I want to delete my own account for testing purposes',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

describe('getSuggestedRole', () => {
  it('prioritizes profileRole > userRole > authRole > fan', async () => {
    const { getSuggestedRole } = await import(
      '@/server/admin/dashboard.server'
    )

    expect(
      getSuggestedRole({
        profileRole: 'crew',
        userRole: 'fan',
        authRole: 'admin',
      }),
    ).toBe('crew')

    expect(
      getSuggestedRole({
        profileRole: null,
        userRole: 'admin',
        authRole: 'fan',
      }),
    ).toBe('admin')

    expect(
      getSuggestedRole({
        profileRole: null,
        userRole: null,
        authRole: 'crew',
      }),
    ).toBe('crew')

    expect(
      getSuggestedRole({
        profileRole: null,
        userRole: null,
        authRole: null,
      }),
    ).toBe('fan')
  })
})

describe('terminateCrewSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sets session to OFF and logs the action', async () => {
    const sessionEqUpdate = vi.fn().mockResolvedValue({ error: null })
    const sessionUpdateFn = vi.fn(() => ({ eq: sessionEqUpdate }))
    const sessionSingle = vi.fn().mockResolvedValue({
      data: { id: 'session-1', status: 'LIVE', crew_user_id: 'crew-1' },
      error: null,
    })
    const adminActionsInsert = vi.fn().mockResolvedValue({ error: null })

    serviceFrom.mockImplementation((table: string) => {
      if (table === 'live_sessions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: sessionSingle })),
          })),
          update: sessionUpdateFn,
        }
      }
      if (table === 'admin_actions') {
        return { insert: adminActionsInsert }
      }
      return chainable()
    })

    const { terminateCrewSession } = await import(
      '@/server/admin/dashboard.server'
    )

    const result = await terminateCrewSession('actor-admin', 'admin', {
      sessionId: 'session-1',
      reason: 'Stale session',
    })

    expect(result).toEqual({ ok: true, sessionId: 'session-1' })
    expect(sessionUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'OFF',
        admin_terminated: true,
        admin_termination_reason: 'Stale session',
      }),
    )
    expect(adminActionsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'TERMINATE_SESSION',
        target_user_id: 'crew-1',
        target_resource_id: 'session-1',
      }),
    )
  })

  it('throws FORBIDDEN for non-admin callers', async () => {
    const { terminateCrewSession } = await import(
      '@/server/admin/dashboard.server'
    )

    await expect(
      terminateCrewSession('actor', 'crew', {
        sessionId: 'session-1',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
