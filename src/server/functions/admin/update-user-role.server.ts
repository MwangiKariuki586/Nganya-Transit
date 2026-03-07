import { createServerFn } from '@tanstack/react-start'
import { enforceServerRole } from '@/server/auth/enforce-role.server'
import type { AppRole } from '@/shared/types/rbac'

export const updateUserRoleServerFn = createServerFn({ method: 'POST' })
  .handler(async ({ data }: { data: { userId: string, role: AppRole } }) => {
    await enforceServerRole(['admin'])
    return {
      ok: false,
      reason: 'Not implemented',
      data,
    }
  })
