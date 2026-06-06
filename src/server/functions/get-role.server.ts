import { createServerFn } from '@tanstack/react-start'
import { normalizeRole } from '@/shared/auth/roles'
import { sessionMiddleware } from '@/server/auth/session-middleware.server'

export const getRoleServerFn = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    return normalizeRole(context.session.role)
  })
