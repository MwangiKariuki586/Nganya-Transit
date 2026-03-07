import { createServerFn } from '@tanstack/react-start'
import { getServerRole } from '@/server/auth/role.server'

export const getRoleServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getServerRole()
})
