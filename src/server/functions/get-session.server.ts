import { createServerFn } from '@tanstack/react-start'
import { sessionMiddleware } from '@/server/auth/session-middleware.server'

export const getSessionServerFn = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    return context.session
  })
