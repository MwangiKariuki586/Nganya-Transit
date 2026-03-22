import { createServerFn } from '@tanstack/react-start'

export const getCrewBootstrapServerFn = createServerFn({ method: 'GET' }).handler(async (ctx) => {
  const crewBootstrap = await import('@/server/crew/bootstrap.server')
  return crewBootstrap.getCrewBootstrapSnapshot((ctx as { request?: Request | null }).request ?? null)
})
