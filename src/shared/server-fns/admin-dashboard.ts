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
    return dashboard.updateAdminUserRole(context.userId, context.role, {
      userId: data.userId,
      role: data.role,
    })
  })

export const terminateCrewSessionServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; sessionId: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.terminateCrewSession(context.userId, context.role, {
      sessionId: data.sessionId,
      reason: data.reason,
    })
  })

export const getUserDetailWithAuditServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.getUserDetailWithAudit(context.role, {
      userId: data.userId,
    })
  })

export const fixRoleMismatchServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; userId: string; targetRole: AppRole }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.fixRoleMismatch(context.userId, context.role, {
      userId: data.userId,
      targetRole: data.targetRole,
    })
  })

export const forceUserSignoutServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; userId: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.forceUserSignout(context.userId, context.role, {
      userId: data.userId,
      reason: data.reason,
    })
  })

export const suspendUserServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; userId: string; reason: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.suspendUser(context.userId, context.role, {
      userId: data.userId,
      reason: data.reason,
    })
  })

export const deleteUserServerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; userId: string; reason: string }) => data)
  .handler(async ({ data }) => {
    const dashboard = await import('@/server/admin/dashboard.server')
    const context = await dashboard.requireAdminDashboardAccess(data.accessToken)
    return dashboard.deleteUser(context.userId, context.role, {
      userId: data.userId,
      reason: data.reason,
    })
  })
