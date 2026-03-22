import { normalizeRole } from '@/shared/auth/roles'
import type { AppRole } from '@/shared/types/rbac'
import { getUserScopedSupabaseClient } from '@/server/supabase/user-client.server'

export interface RegistrationAccessContext {
  accessToken: string
  supabase: ReturnType<typeof getUserScopedSupabaseClient>
  userId: string
  role: AppRole
}

export interface RegistrationMediaInput {
  storagePath: string
  mediaUrl: string
  sortOrder: number
}

export interface RegistrationCreateInput {
  id?: string
  corridorId: string
  proposedName: string
  plateLast4?: string | null
  plateHash?: string | null
  sacco?: string | null
  tags?: string[] | null
  media: RegistrationMediaInput[]
}

function buildRequestSelect() {
  return `
    *,
    corridors(name),
    nganya_registration_request_media(*)
  `
}

function validateAccessToken(accessToken: string | null | undefined) {
  if (!accessToken) {
    throw new Error('AUTH_REQUIRED')
  }
}

async function resolveRole(supabase: ReturnType<typeof getUserScopedSupabaseClient>, userId: string, user: any) {
  let role = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role)

  if (!role) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    role = normalizeRole(profile?.role)
  }

  return role
}

export async function requireRegistrationAccess(accessToken: string): Promise<RegistrationAccessContext> {
  validateAccessToken(accessToken)

  const supabase = getUserScopedSupabaseClient(accessToken)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    throw new Error('AUTH_REQUIRED')
  }

  const role = await resolveRole(supabase, user.id, user)
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

export async function requireAdminRegistrationAccess(accessToken: string) {
  const context = await requireRegistrationAccess(accessToken)
  if (context.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return context
}

export async function listOwnRegistrationRequests(
  context: RegistrationAccessContext,
  options?: { corridorId?: string | null; limit?: number },
) {
  let query = (context.supabase.from('nganya_registration_requests') as any)
    .select(buildRequestSelect())
    .eq('created_by', context.userId)
    .order('created_at', { ascending: false })

  if (options?.corridorId) {
    query = query.eq('corridor_id', options.corridorId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createRegistrationRequest(
  context: RegistrationAccessContext,
  input: RegistrationCreateInput,
) {
  if (!input.media?.length) {
    throw new Error('At least one photo is required.')
  }

  const { data: existingRequest, error: existingRequestError } = await (context.supabase
    .from('nganya_registration_requests') as any)
    .select('id, status, proposed_name')
    .eq('created_by', context.userId)
    .maybeSingle()

  if (existingRequestError) throw existingRequestError

  if (existingRequest) {
    throw new Error(`REGISTRATION_ALREADY_EXISTS:${existingRequest.status}`)
  }

  const requestPayload = {
    ...(input.id ? { id: input.id } : {}),
    created_by: context.userId,
    corridor_id: input.corridorId,
    proposed_name: input.proposedName,
    plate_last4: input.plateLast4 || null,
    plate_hash: input.plateHash || null,
    sacco: input.sacco || null,
    tags: input.tags?.length ? input.tags : [],
    status: 'PENDING',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: request, error: requestError } = await (context.supabase
    .from('nganya_registration_requests') as any)
    .insert(requestPayload)
    .select('id')
    .single()

  if (requestError) throw requestError

  const mediaPayload = input.media.map((item, index) => ({
    request_id: request.id,
    storage_path: item.storagePath,
    media_url: item.mediaUrl,
    sort_order: item.sortOrder ?? index,
  }))

  const { error: mediaError } = await (context.supabase
    .from('nganya_registration_request_media') as any)
    .insert(mediaPayload)

  if (mediaError) throw mediaError

  return getRegistrationRequestById(context, request.id)
}

export async function getRegistrationRequestById(
  context: RegistrationAccessContext,
  requestId: string,
) {
  let query = (context.supabase.from('nganya_registration_requests') as any)
    .select(buildRequestSelect())
    .eq('id', requestId)

  if (context.role !== 'admin') {
    query = query.eq('created_by', context.userId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data) throw new Error('REQUEST_NOT_FOUND')
  return data
}

export async function listAdminRegistrationRequests(
  context: RegistrationAccessContext,
  options?: { status?: string | null; limit?: number },
) {
  let query = (context.supabase.from('nganya_registration_requests') as any)
    .select(`
      *,
      corridors(name),
      profiles!nganya_registration_requests_created_by_fkey(handle, full_name),
      nganya_registration_request_media(*)
    `)
    .order('created_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getAdminRegistrationReviewData(
  context: RegistrationAccessContext,
  requestId: string,
) {
  const request = await getRegistrationRequestById(context, requestId)

  const similarNameQuery = (context.supabase.from('nganyas') as any)
    .select('id, name, corridor_id, corridors(name), created_at')
    .eq('corridor_id', request.corridor_id)
    .ilike('name', `%${request.proposed_name}%`)
    .order('created_at', { ascending: false })
    .limit(5)

  const matchingPlateQuery = request.plate_last4
    ? (context.supabase.from('nganya_registration_requests') as any)
      .select('id, proposed_name, status, plate_last4, created_at, corridors(name)')
      .eq('plate_last4', request.plate_last4)
      .neq('id', request.id)
      .order('created_at', { ascending: false })
      .limit(5)
    : Promise.resolve({ data: [], error: null })

  const [similarNameResult, matchingPlateResult] = await Promise.all([
    similarNameQuery,
    matchingPlateQuery,
  ])

  if (similarNameResult.error) throw similarNameResult.error
  if ('error' in matchingPlateResult && matchingPlateResult.error) throw matchingPlateResult.error

  return {
    request,
    duplicateWarnings: {
      similarNganyas: similarNameResult.data || [],
      matchingPlateHints: 'data' in matchingPlateResult ? (matchingPlateResult.data || []) : [],
    },
  }
}

export async function reviewRegistrationRequest(
  context: RegistrationAccessContext,
  input: { requestId: string; status: 'REJECTED' | 'NEEDS_INFO'; reviewNotes?: string | null },
) {
  const { error } = await (context.supabase.from('nganya_registration_requests') as any)
    .update({
      status: input.status,
      review_notes: input.reviewNotes || null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)

  if (error) throw error

  return getRegistrationRequestById(context, input.requestId)
}

export async function approveRegistrationRequest(
  context: RegistrationAccessContext,
  input: { requestId: string; reviewNotes?: string | null },
) {
  const { data, error } = await (context.supabase.rpc('approve_nganya_registration_request', {
    p_request_id: input.requestId,
    p_review_notes: input.reviewNotes || null,
  }) as any)

  if (error) throw error

  return {
    nganyaId: data as string,
    request: await getRegistrationRequestById(context, input.requestId),
  }
}
