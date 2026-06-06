import { createServerFn } from '@tanstack/react-start'

export const getCurrentRoleServerFn = createServerFn({ method: 'GET' }).handler(async (ctx) => {
  const { getServerRole } = await import('@/server/auth/role.server')
  return getServerRole((ctx as { request?: Request | null }).request ?? null)
})
