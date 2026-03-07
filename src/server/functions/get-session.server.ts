import { createServerFn } from '@tanstack/react-start'
import { getServerSessionSnapshot } from '@/server/auth/session.server'

export const getSessionServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getServerSessionSnapshot()
})
