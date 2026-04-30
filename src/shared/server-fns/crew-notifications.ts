import { createServerFn } from '@tanstack/react-start'
import { getServiceRoleSupabaseClient } from '@/server/supabase/service-role.server'

export const getCrewNotificationsServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)

    const { data: notifications, error } = await (context.supabase
      .from('crew_notifications') as any)
      .select('*')
      .eq('crew_user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return notifications as any[]
  })

export const markNotificationReadServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; id: string }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)

    const { error } = await (context.supabase
      .from('crew_notifications') as any)
      .update({ read_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('crew_user_id', context.userId)
      .is('read_at', null)

    if (error) throw error
    return { ok: true }
  })

export const markAllNotificationsReadServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)

    const { error } = await (context.supabase
      .from('crew_notifications') as any)
      .update({ read_at: new Date().toISOString() })
      .eq('crew_user_id', context.userId)
      .is('read_at', null)

    if (error) throw error
    return { ok: true }
  })

export const getUnreadNotificationCountServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const access = await import('@/server/crew/access.server')
    const context = await access.requireCrewAccess(data.accessToken)

    const { count, error } = await (context.supabase
      .from('crew_notifications') as any)
      .select('*', { count: 'exact', head: true })
      .eq('crew_user_id', context.userId)
      .is('read_at', null)

    if (error) throw error
    return { count: count ?? 0 }
  })

export const sendCrewNotificationServerFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      accessToken: string
      crewUserId: string
      type: 'registration_approved' | 'registration_rejected' | 'registration_needs_info' | 'assignment_changed' | 'admin_message'
      title: string
      body: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const adminModule = await import('@/server/admin/dashboard.server')
    const adminCtx = await adminModule.requireAdminDashboardAccess(data.accessToken)

    const serviceSupabase = getServiceRoleSupabaseClient()

    const { error } = await (serviceSupabase
      .from('crew_notifications') as any)
      .insert({
        crew_user_id: data.crewUserId,
        type: data.type,
        title: data.title,
        body: data.body,
        created_by: adminCtx.userId,
      })

    if (error) throw error
    return { ok: true }
  })
