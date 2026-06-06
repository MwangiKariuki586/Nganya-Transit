import { create } from 'zustand'
import { adminDashboardService } from '@/modules/admin/services/admin-dashboard-service'
import { nganyaRegistrationService } from '@/features/nganya-registration/services/nganya-registration-service'
import type { AppRole } from '@/shared/types/rbac'

const OVERVIEW_TTL = 60_000 // 60 seconds
const USERS_TTL = 45_000 // 45 seconds
const CREW_MANAGEMENT_TTL = 20_000 // 20 seconds
const REGISTRATIONS_TTL = 15_000 // 15 seconds
const REGISTRATION_DETAIL_TTL = 15_000 // 15 seconds

interface AdminStoreState {
  // Overview data
  overview: any | null
  overviewLastFetchedAt: number | null
  isLoadingOverview: boolean
  overviewError: Error | null

  // Users data
  users: any[]
  usersLastFetchedAt: number | null
  isLoadingUsers: boolean
  usersError: Error | null

  // Crew management data
  crewManagement: any | null
  crewManagementLastFetchedAt: number | null
  isLoadingCrewManagement: boolean
  crewManagementError: Error | null

  // Registrations data
  registrations: any[]
  registrationsLastFetchedAt: number | null
  isLoadingRegistrations: boolean
  registrationsError: Error | null

  // Registration detail
  registrationDetail: any | null
  registrationDetailId: string | null
  registrationDetailLastFetchedAt: number | null
  isLoadingRegistrationDetail: boolean
  registrationDetailError: Error | null

  // Actions
  fetchOverview: () => Promise<any>
  fetchOverviewDeep: () => Promise<any> // Fetches overview + top items for mini tables
  fetchUsers: () => Promise<any[]>
  fetchCrewManagement: () => Promise<any>
  fetchRegistrations: (limit?: number, status?: string | null) => Promise<any[]>
  fetchRegistrationDetail: (requestId: string) => Promise<any>

  // Mutations
  updateUserRole: (userId: string, role: AppRole) => Promise<void>
  fixRoleMismatch: (userId: string, targetRole: AppRole) => Promise<{ warnings?: string[] }>
  forceUserSignout: (userId: string, reason?: string) => Promise<void>
  suspendUser: (userId: string, reason: string) => Promise<void>
  deleteUser: (userId: string, reason: string) => Promise<void>
  assignCrewNganya: (userId: string, nganyaId: string) => Promise<void>
  unassignCrewNganya: (userId: string) => Promise<void>
  approveRequest: (requestId: string, reviewNotes?: string) => Promise<void>
  reviewRequest: (requestId: string, status: 'REJECTED' | 'NEEDS_INFO', reviewNotes?: string) => Promise<void>
  terminateSession: (sessionId: string, reason?: string) => Promise<void>

  // User detail
  userDetail: any | null
  isLoadingUserDetail: boolean
  userDetailError: Error | null
  fetchUserDetail: (userId: string) => Promise<any>

  // Invalidation
  invalidateOverview: () => void
  invalidateUsers: () => void
  invalidateCrewManagement: () => void
  invalidateRegistrations: () => void
  invalidateRegistrationDetail: () => void
  invalidateAll: () => void

  // Selectors
  isOverviewStale: () => boolean
  isUsersStale: () => boolean
  isCrewManagementStale: () => boolean
  isRegistrationsStale: () => boolean
  isRegistrationDetailStale: () => boolean
}

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  // Overview data
  overview: null,
  overviewLastFetchedAt: null,
  isLoadingOverview: false,
  overviewError: null,

  // Users data
  users: [],
  usersLastFetchedAt: null,
  isLoadingUsers: false,
  usersError: null,

  // Crew management data
  crewManagement: null,
  crewManagementLastFetchedAt: null,
  isLoadingCrewManagement: false,
  crewManagementError: null,

  // Registrations data
  registrations: [],
  registrationsLastFetchedAt: null,
  isLoadingRegistrations: false,
  registrationsError: null,

  // Registration detail
  registrationDetail: null,
  registrationDetailId: null,
  registrationDetailLastFetchedAt: null,
  isLoadingRegistrationDetail: false,
  registrationDetailError: null,

  // User detail
  userDetail: null,
  isLoadingUserDetail: false,
  userDetailError: null,

  // Selectors
  isOverviewStale: () => {
    const lastFetchedAt = get().overviewLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > OVERVIEW_TTL
  },

  isUsersStale: () => {
    const lastFetchedAt = get().usersLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > USERS_TTL
  },

  isCrewManagementStale: () => {
    const lastFetchedAt = get().crewManagementLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > CREW_MANAGEMENT_TTL
  },

  isRegistrationsStale: () => {
    const lastFetchedAt = get().registrationsLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > REGISTRATIONS_TTL
  },

  isRegistrationDetailStale: () => {
    const lastFetchedAt = get().registrationDetailLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > REGISTRATION_DETAIL_TTL
  },

  // Actions
  fetchOverview: async () => {
    // Check cache first (stale-while-revalidate)
    const cached = get().overview
    const isStale = get().isOverviewStale()

    if (cached && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale) {
      const promise = adminDashboardService.getOverview()

      promise
        .then((data) => {
          set({
            overview: data,
            overviewLastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingOverview: true, overviewError: null })

    try {
      const data = await adminDashboardService.getOverview()
      set({
        overview: data,
        overviewLastFetchedAt: Date.now(),
        isLoadingOverview: false,
      })
      return data
    } catch (error) {
      set({
        overviewError: error as Error,
        isLoadingOverview: false,
      })
      throw error
    }
  },

  fetchOverviewDeep: async () => {
    // Fetch overview stats + top items for mini tables in parallel
    set({ isLoadingOverview: true, overviewError: null })

    try {
      const [overviewStats, topRegistrations, topCrew, topUsers] = await Promise.all([
        adminDashboardService.getOverview(),
        get().fetchRegistrations(5),
        adminDashboardService.listCrew(),
        get().fetchUsers(),
      ])

      set({
        overview: overviewStats,
        overviewLastFetchedAt: Date.now(),
        registrations: topRegistrations,
        registrationsLastFetchedAt: Date.now(),
        crewManagement: { crewRows: topCrew, nganyaOptions: [] },
        crewManagementLastFetchedAt: Date.now(),
        users: topUsers,
        usersLastFetchedAt: Date.now(),
        isLoadingOverview: false,
      })

      return {
        overview: overviewStats,
        topRegistrations,
        topCrew: topCrew.slice(0, 5),
        topUsers: topUsers.slice(0, 5),
      }
    } catch (error) {
      set({
        overviewError: error as Error,
        isLoadingOverview: false,
      })
      throw error
    }
  },

  fetchUsers: async () => {
    // Check cache first (stale-while-revalidate)
    const cached = get().users
    const isStale = get().isUsersStale()

    if (cached && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale) {
      const promise = adminDashboardService.listUsers()

      promise
        .then((data) => {
          set({
            users: data,
            usersLastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingUsers: true, usersError: null })

    try {
      const data = await adminDashboardService.listUsers()
      set({
        users: data,
        usersLastFetchedAt: Date.now(),
        isLoadingUsers: false,
      })
      return data
    } catch (error) {
      set({
        usersError: error as Error,
        isLoadingUsers: false,
      })
      throw error
    }
  },

  fetchCrewManagement: async () => {
    // Check cache first (stale-while-revalidate)
    const cached = get().crewManagement
    const isStale = get().isCrewManagementStale()

    if (cached && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale) {
      const promise = adminDashboardService.getCrewManagementData()

      promise
        .then((data) => {
          set({
            crewManagement: data,
            crewManagementLastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingCrewManagement: true, crewManagementError: null })

    try {
      const data = await adminDashboardService.getCrewManagementData()
      set({
        crewManagement: data,
        crewManagementLastFetchedAt: Date.now(),
        isLoadingCrewManagement: false,
      })
      return data
    } catch (error) {
      set({
        crewManagementError: error as Error,
        isLoadingCrewManagement: false,
      })
      throw error
    }
  },

  fetchRegistrations: async (limit?: number, status?: string | null) => {
    // Check cache first (stale-while-revalidate)
    const cached = get().registrations
    const isStale = get().isRegistrationsStale()

    if (cached && !isStale && !status) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale && !status) {
      const promise = nganyaRegistrationService.listAdminRequests({ limit, status })

      promise
        .then((data) => {
          set({
            registrations: data,
            registrationsLastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingRegistrations: true, registrationsError: null })

    try {
      const data = await nganyaRegistrationService.listAdminRequests({ limit, status })
      set({
        registrations: data,
        registrationsLastFetchedAt: Date.now(),
        isLoadingRegistrations: false,
      })
      return data
    } catch (error) {
      set({
        registrationsError: error as Error,
        isLoadingRegistrations: false,
      })
      throw error
    }
  },

  fetchRegistrationDetail: async (requestId: string) => {
    // Check cache first (stale-while-revalidate)
    const cached = get().registrationDetail
    const cachedId = get().registrationDetailId
    const isStale = get().isRegistrationDetailStale()

    if (cached && cachedId === requestId && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && cachedId === requestId && isStale) {
      const promise = nganyaRegistrationService.getAdminReviewData(requestId)

      promise
        .then((data) => {
          set({
            registrationDetail: data,
            registrationDetailId: requestId,
            registrationDetailLastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache or different ID, fetch fresh
    set({ isLoadingRegistrationDetail: true, registrationDetailError: null })

    try {
      const data = await nganyaRegistrationService.getAdminReviewData(requestId)
      set({
        registrationDetail: data,
        registrationDetailId: requestId,
        registrationDetailLastFetchedAt: Date.now(),
        isLoadingRegistrationDetail: false,
      })
      return data
    } catch (error) {
      set({
        registrationDetailError: error as Error,
        isLoadingRegistrationDetail: false,
      })
      throw error
    }
  },

  // Mutations
  updateUserRole: async (userId: string, role: AppRole) => {
    const currentUsers = get().users

    // Optimistic update
    const updatedUsers = currentUsers?.map((user) =>
      user.id === userId ? { ...user, role } : user
    )
    set({ users: updatedUsers })

    try {
      await adminDashboardService.updateUserRole(userId, role)

      // Invalidate to trigger refresh
      get().invalidateUsers()
    } catch (error) {
      // Rollback optimistic update
      set({ users: currentUsers, usersError: error as Error })
      throw error
    }
  },

  fixRoleMismatch: async (userId: string, targetRole: AppRole) => {
    try {
      const result = await adminDashboardService.fixRoleMismatch(userId, targetRole)

      // Invalidate users to trigger refresh
      get().invalidateUsers()

      return result
    } catch (error) {
      set({ usersError: error as Error })
      throw error
    }
  },

  forceUserSignout: async (userId: string, reason?: string) => {
    try {
      await adminDashboardService.forceUserSignout(userId, reason)
    } catch (error) {
      set({ usersError: error as Error })
      throw error
    }
  },

  suspendUser: async (userId: string, reason: string) => {
    try {
      await adminDashboardService.suspendUser(userId, reason)
      // Invalidate users to trigger refresh
      get().invalidateUsers()
    } catch (error) {
      set({ usersError: error as Error })
      throw error
    }
  },

  deleteUser: async (userId: string, reason: string) => {
    try {
      await adminDashboardService.deleteUser(userId, reason)
      // Invalidate users to trigger refresh
      get().invalidateUsers()
    } catch (error) {
      set({ usersError: error as Error })
      throw error
    }
  },

  fetchUserDetail: async (userId: string) => {
    set({ isLoadingUserDetail: true, userDetailError: null })

    try {
      const data = await adminDashboardService.getUserDetailWithAudit(userId)
      set({
        userDetail: data,
        isLoadingUserDetail: false,
      })
      return data
    } catch (error) {
      set({
        userDetailError: error as Error,
        isLoadingUserDetail: false,
      })
      throw error
    }
  },

  assignCrewNganya: async (userId: string, nganyaId: string) => {
    try {
      await adminDashboardService.assignCrewNganya(userId, nganyaId)

      // Invalidate crew management to trigger refresh
      get().invalidateCrewManagement()
    } catch (error) {
      set({ crewManagementError: error as Error })
      throw error
    }
  },

  unassignCrewNganya: async (userId: string) => {
    try {
      await adminDashboardService.unassignCrewNganya(userId)

      // Invalidate crew management to trigger refresh
      get().invalidateCrewManagement()
    } catch (error) {
      set({ crewManagementError: error as Error })
      throw error
    }
  },

  approveRequest: async (requestId: string, reviewNotes?: string) => {
    try {
      await nganyaRegistrationService.approveRequest({ requestId, reviewNotes: reviewNotes || null })

      // Invalidate registrations and detail to trigger refresh
      get().invalidateRegistrations()
      get().invalidateRegistrationDetail()
    } catch (error) {
      set({ registrationsError: error as Error })
      throw error
    }
  },

  reviewRequest: async (requestId: string, status: 'REJECTED' | 'NEEDS_INFO', reviewNotes?: string) => {
    try {
      await nganyaRegistrationService.reviewRequest({ requestId, status, reviewNotes: reviewNotes || null })

      // Invalidate registrations and detail to trigger refresh
      get().invalidateRegistrations()
      get().invalidateRegistrationDetail()
    } catch (error) {
      set({ registrationsError: error as Error })
      throw error
    }
  },

  terminateSession: async (sessionId: string, reason?: string) => {
    try {
      await adminDashboardService.terminateSession(sessionId, reason)

      // Invalidate crew management to trigger refresh
      get().invalidateCrewManagement()
    } catch (error) {
      set({ crewManagementError: error as Error })
      throw error
    }
  },

  // Invalidation
  invalidateOverview: () => {
    set({ overviewLastFetchedAt: null })
  },

  invalidateUsers: () => {
    set({ usersLastFetchedAt: null })
  },

  invalidateCrewManagement: () => {
    set({ crewManagementLastFetchedAt: null })
  },

  invalidateRegistrations: () => {
    set({ registrationsLastFetchedAt: null })
  },

  invalidateRegistrationDetail: () => {
    set({ registrationDetailLastFetchedAt: null })
  },

  invalidateAll: () => {
    set({
      overviewLastFetchedAt: null,
      usersLastFetchedAt: null,
      crewManagementLastFetchedAt: null,
      registrationsLastFetchedAt: null,
      registrationDetailLastFetchedAt: null,
    })
  },
}))
