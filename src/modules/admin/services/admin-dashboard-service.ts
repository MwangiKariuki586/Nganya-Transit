import { assignCrewNganyaServerFn, deleteUserServerFn, fixRoleMismatchServerFn, forceUserSignoutServerFn, getAdminOverviewServerFn, getUserDetailWithAuditServerFn, listAdminCrewServerFn, listAdminNganyaOptionsServerFn, listAdminUsersServerFn, suspendUserServerFn, terminateCrewSessionServerFn, unassignCrewNganyaServerFn, updateAdminUserRoleServerFn } from '@/shared/server-fns/admin-dashboard'
import { requireClientAccessToken } from '@/shared/auth/client-session'
import type { AppRole } from '@/shared/types/rbac'

export const adminDashboardService = {
  async getOverview() {
    const accessToken = await requireClientAccessToken()
    return getAdminOverviewServerFn({ data: { accessToken } })
  },

  async listUsers() {
    const accessToken = await requireClientAccessToken()
    return listAdminUsersServerFn({ data: { accessToken } })
  },

  async listCrew() {
    const accessToken = await requireClientAccessToken()
    return listAdminCrewServerFn({ data: { accessToken } })
  },

  async listNganyaOptions() {
    const accessToken = await requireClientAccessToken()
    return listAdminNganyaOptionsServerFn({ data: { accessToken } })
  },

  async getCrewManagementData() {
    const accessToken = await requireClientAccessToken()
    const [crewRows, nganyaOptions] = await Promise.all([
      listAdminCrewServerFn({ data: { accessToken } }),
      listAdminNganyaOptionsServerFn({ data: { accessToken } }),
    ])

    return { crewRows, nganyaOptions }
  },

  async updateUserRole(userId: string, role: AppRole) {
    const accessToken = await requireClientAccessToken()
    return updateAdminUserRoleServerFn({ data: { accessToken, userId, role } })
  },

  async assignCrewNganya(crewUserId: string, nganyaId: string) {
    const accessToken = await requireClientAccessToken()
    return assignCrewNganyaServerFn({ data: { accessToken, crewUserId, nganyaId } })
  },

  async unassignCrewNganya(crewUserId: string) {
    const accessToken = await requireClientAccessToken()
    return unassignCrewNganyaServerFn({ data: { accessToken, crewUserId } })
  },

  async terminateSession(sessionId: string, reason?: string) {
    const accessToken = await requireClientAccessToken()
    return terminateCrewSessionServerFn({ data: { accessToken, sessionId, reason } })
  },

  async getUserDetailWithAudit(userId: string) {
    const accessToken = await requireClientAccessToken()
    return getUserDetailWithAuditServerFn({ data: { accessToken, userId } })
  },

  async fixRoleMismatch(userId: string, targetRole: AppRole) {
    const accessToken = await requireClientAccessToken()
    return fixRoleMismatchServerFn({ data: { accessToken, userId, targetRole } })
  },

  async forceUserSignout(userId: string, reason?: string) {
    const accessToken = await requireClientAccessToken()
    return forceUserSignoutServerFn({ data: { accessToken, userId, reason } })
  },

  async suspendUser(userId: string, reason: string) {
    const accessToken = await requireClientAccessToken()
    return suspendUserServerFn({ data: { accessToken, userId, reason } })
  },

  async deleteUser(userId: string, reason: string) {
    const accessToken = await requireClientAccessToken()
    return deleteUserServerFn({ data: { accessToken, userId, reason } })
  },
}
