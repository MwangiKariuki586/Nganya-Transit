import { assignCrewNganyaServerFn, getAdminOverviewServerFn, listAdminCrewServerFn, listAdminNganyaOptionsServerFn, listAdminUsersServerFn, unassignCrewNganyaServerFn, updateAdminUserRoleServerFn } from '@/shared/server-fns/admin-dashboard'
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
}
