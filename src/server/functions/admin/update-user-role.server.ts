import { createServerFn } from '@tanstack/react-start'
import { sessionMiddleware } from '@/server/auth/session-middleware.server'
import { getServiceRoleSupabaseClient } from '@/server/supabase/service-role.server'
import type { AppRole } from '@/shared/types/rbac'
import { normalizeRole } from '@/shared/auth/roles'
import { forbidden } from '@/shared/errors/app-error'

export const updateUserRoleServerFn = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .inputValidator((data: { userId: string, role: AppRole }) => data)
  .handler(async ({ data, context }: { data: { userId: string, role: AppRole }, context: { session: { role: string | null } } }) => {
    const requestRole = normalizeRole(context.session.role)
    if (requestRole !== 'admin') {
      throw forbidden()
    }

    const supabase = getServiceRoleSupabaseClient()

    const { data: existingUserData, error: existingUserError } = await supabase.auth.admin.getUserById(data.userId)
    if (existingUserError) throw existingUserError

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: data.role })
      .eq('id', data.userId)

    if (profileError) throw profileError

    const { error: userRoleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: data.userId,
        role: data.role,
      }, {
        onConflict: 'user_id',
      })

    if (userRoleError) throw userRoleError

    const { error: authError } = await supabase.auth.admin.updateUserById(data.userId, {
      app_metadata: {
        ...(existingUserData.user?.app_metadata ?? {}),
        role: data.role,
      },
      user_metadata: {
        ...(existingUserData.user?.user_metadata ?? {}),
        role: data.role,
        intent: data.role,
      },
    })

    if (authError) throw authError

    return {
      ok: true,
      data,
    }
  })
