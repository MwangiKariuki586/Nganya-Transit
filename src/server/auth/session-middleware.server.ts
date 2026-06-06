import { createMiddleware } from '@tanstack/react-start'
import { resolveSessionSnapshotFromRequest } from './session.server'

export const sessionMiddleware = createMiddleware().server(async ({ request, next }) => {
  const session = await resolveSessionSnapshotFromRequest(request)
  return next({
    context: {
      session,
    },
  })
})
