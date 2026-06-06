import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock chain builders ────────────────────────────────────────────────────

function chainable(terminal: Record<string, vi.Mock> = {}) {
  const self: Record<string, any> = {}
  const methods = ['select', 'eq', 'neq', 'ilike', 'order', 'limit', 'insert', 'update']
  for (const m of methods) {
    self[m] = vi.fn(() => self)
  }
  self.maybeSingle = vi.fn()
  self.single = vi.fn()
  Object.assign(self, terminal)
  return self
}

// ── Supabase mock wiring ───────────────────────────────────────────────────

const getUser = vi.fn()
const rpc = vi.fn()
const chains: Record<string, ReturnType<typeof chainable>> = {
  profiles: chainable(),
  nganya_registration_requests: chainable(),
  nganya_registration_request_media: chainable(),
  nganyas: chainable(),
}
const from = vi.fn((table: string) => chains[table] ?? chainable())

vi.mock('@/server/supabase/user-client.server', () => ({
  getUserScopedSupabaseClient: vi.fn(() => ({
    auth: { getUser },
    from,
    rpc,
  })),
}))

vi.mock('@/shared/auth/roles', () => ({
  normalizeRole: vi.fn((r: string | undefined) => r ?? null),
}))

// ── Imports (must come after vi.mock) ──────────────────────────────────────

import {
  requireRegistrationAccess,
  requireAdminRegistrationAccess,
  createRegistrationRequest,
  reviewRegistrationRequest,
  approveRegistrationRequest,
  getRegistrationRequestById,
  type RegistrationAccessContext,
} from '../requests.server'

// ── Helpers ────────────────────────────────────────────────────────────────

function resetAllChains() {
  for (const c of Object.values(chains)) {
    for (const v of Object.values(c)) {
      if (typeof v?.mockReset === 'function') v.mockReset()
      if (typeof v?.mockReturnThis === 'function') v.mockReturnThis()
    }
    c.select?.mockReturnThis()
    c.eq?.mockReturnThis()
    c.neq?.mockReturnThis()
    c.ilike?.mockReturnThis()
    c.order?.mockReturnThis()
    c.limit?.mockReturnThis()
    c.insert?.mockReturnThis()
    c.update?.mockReturnThis()
  }
}

function adminContext(overrides: Partial<RegistrationAccessContext> = {}): RegistrationAccessContext {
  return {
    accessToken: 'admin-token',
    supabase: { auth: { getUser }, from, rpc } as any,
    userId: 'admin-1',
    role: 'admin',
    ...overrides,
  }
}

function crewContext(overrides: Partial<RegistrationAccessContext> = {}): RegistrationAccessContext {
  return {
    accessToken: 'crew-token',
    supabase: { auth: { getUser }, from, rpc } as any,
    userId: 'crew-1',
    role: 'crew',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('requireRegistrationAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllChains()
  })

  it('throws AUTH_REQUIRED when no access token is provided', async () => {
    await expect(requireRegistrationAccess('')).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    })
  })

  it('throws AUTH_REQUIRED when getUser returns an error', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') })

    await expect(requireRegistrationAccess('bad-token')).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    })
  })

  it('throws FORBIDDEN when user has no allowed role', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u-1', app_metadata: { role: 'fan' }, user_metadata: {} } },
      error: null,
    })
    chains.profiles.maybeSingle.mockResolvedValue({ data: { role: 'fan' }, error: null })

    await expect(requireRegistrationAccess('fan-token')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('succeeds for crew role from app_metadata', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'c-1', app_metadata: { role: 'crew' }, user_metadata: {} } },
      error: null,
    })

    const ctx = await requireRegistrationAccess('crew-token')
    expect(ctx.role).toBe('crew')
    expect(ctx.userId).toBe('c-1')
  })

  it('succeeds for admin role from app_metadata', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'a-1', app_metadata: { role: 'admin' }, user_metadata: {} } },
      error: null,
    })

    const ctx = await requireRegistrationAccess('admin-token')
    expect(ctx.role).toBe('admin')
  })

  it('falls back to profiles table when metadata has no role', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u-1', app_metadata: {}, user_metadata: {} } },
      error: null,
    })
    chains.profiles.maybeSingle.mockResolvedValue({ data: { role: 'crew' }, error: null })

    const ctx = await requireRegistrationAccess('token')
    expect(ctx.role).toBe('crew')
  })
})

describe('requireAdminRegistrationAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllChains()
  })

  it('throws FORBIDDEN for crew users', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'c-1', app_metadata: { role: 'crew' }, user_metadata: {} } },
      error: null,
    })

    await expect(requireAdminRegistrationAccess('crew-token')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('succeeds for admin users', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'a-1', app_metadata: { role: 'admin' }, user_metadata: {} } },
      error: null,
    })

    const ctx = await requireAdminRegistrationAccess('admin-token')
    expect(ctx.role).toBe('admin')
  })
})

describe('createRegistrationRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllChains()
  })

  it('throws validation error when no media is provided', async () => {
    const ctx = crewContext()

    await expect(
      createRegistrationRequest(ctx, {
        corridorId: 'corridor-1',
        proposedName: 'Matwana Express',
        media: [],
      }),
    ).rejects.toThrow('At least one photo is required')
  })

  it('throws validation error when a request already exists', async () => {
    const ctx = crewContext()
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-1', status: 'PENDING', proposed_name: 'Old Request' },
      error: null,
    })

    await expect(
      createRegistrationRequest(ctx, {
        corridorId: 'corridor-1',
        proposedName: 'New Request',
        media: [{ storagePath: 'a/b.jpg', mediaUrl: 'https://cdn/b.jpg', sortOrder: 0 }],
      }),
    ).rejects.toThrow('registration already exists')
  })

  it('creates request and media rows on success', async () => {
    const ctx = crewContext()

    // No existing request
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Insert returns id
    chains.nganya_registration_requests.single.mockResolvedValueOnce({
      data: { id: 'new-req-1' },
      error: null,
    })
    // Media insert succeeds
    chains.nganya_registration_request_media.insert?.mockReturnThis()
    chains.nganya_registration_request_media.maybeSingle?.mockResolvedValue({ data: null, error: null })

    // getRegistrationRequestById select chain
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'new-req-1', status: 'PENDING', proposed_name: 'Matwana Express' },
      error: null,
    })

    const result = await createRegistrationRequest(ctx, {
      corridorId: 'corridor-1',
      proposedName: 'Matwana Express',
      media: [{ storagePath: 'u/photo.jpg', mediaUrl: 'https://cdn/photo.jpg', sortOrder: 0 }],
    })

    expect(result).toMatchObject({ id: 'new-req-1', status: 'PENDING' })
    expect(from).toHaveBeenCalledWith('nganya_registration_request_media')
  })
})

describe('reviewRegistrationRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllChains()
  })

  it('sets status to REJECTED with review notes', async () => {
    const ctx = adminContext()

    chains.nganya_registration_requests.eq.mockReturnThis()
    chains.nganya_registration_requests.update?.mockReturnThis()
    // After update, getRegistrationRequestById fires
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'req-1', status: 'REJECTED', review_notes: 'Duplicate entry' },
      error: null,
    })

    const result = await reviewRegistrationRequest(ctx, {
      requestId: 'req-1',
      status: 'REJECTED',
      reviewNotes: 'Duplicate entry',
    })

    expect(result).toMatchObject({ status: 'REJECTED', review_notes: 'Duplicate entry' })
    expect(chains.nganya_registration_requests.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'REJECTED',
        review_notes: 'Duplicate entry',
        reviewed_by: 'admin-1',
      }),
    )
  })

  it('sets status to NEEDS_INFO', async () => {
    const ctx = adminContext()

    chains.nganya_registration_requests.update?.mockReturnThis()
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'req-2', status: 'NEEDS_INFO', review_notes: 'Better photo needed' },
      error: null,
    })

    const result = await reviewRegistrationRequest(ctx, {
      requestId: 'req-2',
      status: 'NEEDS_INFO',
      reviewNotes: 'Better photo needed',
    })

    expect(result).toMatchObject({ status: 'NEEDS_INFO' })
  })

  it('propagates database errors', async () => {
    const ctx = adminContext()
    const dbError = new Error('connection lost')
    chains.nganya_registration_requests.eq.mockImplementation(() => {
      throw dbError
    })

    await expect(
      reviewRegistrationRequest(ctx, { requestId: 'req-1', status: 'REJECTED' }),
    ).rejects.toThrow('connection lost')
  })
})

describe('approveRegistrationRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllChains()
  })

  it('calls the RPC and returns nganya ID', async () => {
    const ctx = adminContext()

    rpc.mockResolvedValueOnce({ data: 'nganya-uuid-1', error: null })
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'req-1', status: 'APPROVED' },
      error: null,
    })

    const result = await approveRegistrationRequest(ctx, {
      requestId: 'req-1',
      reviewNotes: 'Looks good',
    })

    expect(result.nganyaId).toBe('nganya-uuid-1')
    expect(result.request).toMatchObject({ status: 'APPROVED' })
    expect(rpc).toHaveBeenCalledWith('approve_nganya_registration_request', {
      p_request_id: 'req-1',
      p_review_notes: 'Looks good',
    })
  })

  it('propagates RPC errors', async () => {
    const ctx = adminContext()
    rpc.mockResolvedValueOnce({ data: null, error: new Error('RPC failed') })

    await expect(
      approveRegistrationRequest(ctx, { requestId: 'req-1' }),
    ).rejects.toThrow('RPC failed')
  })

  it('passes null review notes when omitted', async () => {
    const ctx = adminContext()
    rpc.mockResolvedValueOnce({ data: 'nganya-2', error: null })
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'req-2', status: 'APPROVED' },
      error: null,
    })

    await approveRegistrationRequest(ctx, { requestId: 'req-2' })

    expect(rpc).toHaveBeenCalledWith('approve_nganya_registration_request', {
      p_request_id: 'req-2',
      p_review_notes: null,
    })
  })
})

describe('getRegistrationRequestById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllChains()
  })

  it('returns request when found by admin (no created_by filter)', async () => {
    const ctx = adminContext()
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'req-1', created_by: 'someone-else', status: 'PENDING' },
      error: null,
    })

    const result = await getRegistrationRequestById(ctx, 'req-1')
    expect(result).toMatchObject({ id: 'req-1' })
  })

  it('scopes to own requests for non-admin roles', async () => {
    const ctx = crewContext()
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: { id: 'req-1', created_by: 'crew-1', status: 'PENDING' },
      error: null,
    })

    await getRegistrationRequestById(ctx, 'req-1')

    const eqCalls = chains.nganya_registration_requests.eq.mock.calls
    const hasCreatedByFilter = eqCalls.some(
      ([col, val]: [string, string]) => col === 'created_by' && val === 'crew-1',
    )
    expect(hasCreatedByFilter).toBe(true)
  })

  it('throws NOT_FOUND when request does not exist', async () => {
    const ctx = adminContext()
    chains.nganya_registration_requests.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    await expect(getRegistrationRequestById(ctx, 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
