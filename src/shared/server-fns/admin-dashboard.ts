import { createServerFn } from '@tanstack/react-start'
import type { AppRole } from '@/shared/types/rbac'

export const getAdminOverviewServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.getAdminOverview(context.role)
  })

export const listAdminUsersServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.listAdminUsers(context.role)
  })

export const listAdminCrewServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.listAdminCrew(context.role)
  })

export const listAdminNganyaOptionsServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.listAdminNganyaOptions(context.role)
  })

export const assignCrewNganyaServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; crewUserId: string; nganyaId: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.assignCrewNganya(context.role, {
      crewUserId: data.crewUserId,
      nganyaId: data.nganyaId,
    })
  })

export const unassignCrewNganyaServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; crewUserId: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.unassignCrewNganya(context.role, {
      crewUserId: data.crewUserId,
    })
  })

export const updateAdminUserRoleServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; userId: string; role: AppRole }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.updateAdminUserRole(context.role, {
      userId: data.userId,
      role: data.role,
    })
  })
