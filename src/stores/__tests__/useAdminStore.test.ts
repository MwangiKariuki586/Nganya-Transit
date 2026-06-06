/**
 * Unit tests for useAdminStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly for all data domains
 * - Stale-while-revalidate pattern works correctly
 * - Optimistic updates work correctly for mutations
 * - Rollback on error works correctly
 * - Cache invalidation works correctly for multiple data domains
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAdminStore } from '../useAdminStore'
import { adminDashboardService } from '@/modules/admin/services/admin-dashboard-service'
import { nganyaRegistrationService } from '@/features/nganya-registration/services/nganya-registration-service'

// Mock data
const mockOverview = {
  totalUsers: 100,
  totalNganyas: 50,
  totalSightings: 1000,
}

const mockUsers = [
  { id: 'user-1', email: 'user1@example.com', role: 'fan' },
  { id: 'user-2', email: 'user2@example.com', role: 'crew' },
]

const mockCrewManagement = {
  crewMembers: [
    { id: 'user-2', nganyaId: 'nganya-1' },
  ],
  availableNganyas: [
    { id: 'nganya-1', name: 'Nganya 1' },
  ],
}

const mockRegistrations = [
  { id: 'reg-1', status: 'PENDING', nganyaName: 'Test Nganya 1' },
  { id: 'reg-2', status: 'PENDING', nganyaName: 'Test Nganya 2' },
]

const mockRegistrationDetail = {
  id: 'reg-1',
  status: 'PENDING',
  nganyaName: 'Test Nganya 1',
  submittedBy: 'user-1',
}

describe('useAdminStore', () => {
  beforeEach(() => {
    // Reset store state
    useAdminStore.setState({
      overview: null,
      overviewLastFetchedAt: null,
      isLoadingOverview: false,
      overviewError: null,
      users: [],
      usersLastFetchedAt: null,
      isLoadingUsers: false,
      usersError: null,
      crewManagement: null,
      crewManagementLastFetchedAt: null,
      isLoadingCrewManagement: false,
      crewManagementError: null,
      registrations: [],
      registrationsLastFetchedAt: null,
      isLoadingRegistrations: false,
      registrationsError: null,
      registrationDetail: null,
      registrationDetailId: null,
      registrationDetailLastFetchedAt: null,
      isLoadingRegistrationDetail: false,
      registrationDetailError: null,
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return correct staleness for overview (60s TTL)', () => {
      useAdminStore.setState({
        overviewLastFetchedAt: Date.now() - 30_000, // 30 seconds ago
      })
      expect(useAdminStore.getState().isOverviewStale()).toBe(false)

      useAdminStore.setState({
        overviewLastFetchedAt: Date.now() - 70_000, // 70 seconds ago
      })
      expect(useAdminStore.getState().isOverviewStale()).toBe(true)
    })

    it('should return correct staleness for users (45s TTL)', () => {
      useAdminStore.setState({
        usersLastFetchedAt: Date.now() - 20_000, // 20 seconds ago
      })
      expect(useAdminStore.getState().isUsersStale()).toBe(false)

      useAdminStore.setState({
        usersLastFetchedAt: Date.now() - 50_000, // 50 seconds ago
      })
      expect(useAdminStore.getState().isUsersStale()).toBe(true)
    })

    it('should return correct staleness for crew management (20s TTL)', () => {
      useAdminStore.setState({
        crewManagementLastFetchedAt: Date.now() - 10_000, // 10 seconds ago
      })
      expect(useAdminStore.getState().isCrewManagementStale()).toBe(false)

      useAdminStore.setState({
        crewManagementLastFetchedAt: Date.now() - 25_000, // 25 seconds ago
      })
      expect(useAdminStore.getState().isCrewManagementStale()).toBe(true)
    })

    it('should return correct staleness for registrations (15s TTL)', () => {
      useAdminStore.setState({
        registrationsLastFetchedAt: Date.now() - 10_000, // 10 seconds ago
      })
      expect(useAdminStore.getState().isRegistrationsStale()).toBe(false)

      useAdminStore.setState({
        registrationsLastFetchedAt: Date.now() - 20_000, // 20 seconds ago
      })
      expect(useAdminStore.getState().isRegistrationsStale()).toBe(true)
    })

    it('should return correct staleness for registration detail (15s TTL)', () => {
      useAdminStore.setState({
        registrationDetailLastFetchedAt: Date.now() - 10_000, // 10 seconds ago
      })
      expect(useAdminStore.getState().isRegistrationDetailStale()).toBe(false)

      useAdminStore.setState({
        registrationDetailLastFetchedAt: Date.now() - 20_000, // 20 seconds ago
      })
      expect(useAdminStore.getState().isRegistrationDetailStale()).toBe(true)
    })
  })

  describe('Stale-while-revalidate pattern - fetchOverview', () => {
    it('should return cached overview when fresh', async () => {
      const getOverviewSpy = vi.spyOn(adminDashboardService, 'getOverview').mockResolvedValue(mockOverview)

      useAdminStore.setState({
        overview: mockOverview,
        overviewLastFetchedAt: Date.now() - 30_000, // fresh
      })

      const { fetchOverview } = useAdminStore.getState()
      const result = await fetchOverview()

      expect(result).toEqual(mockOverview)
      expect(getOverviewSpy).not.toHaveBeenCalled()
    })

    it('should return stale overview immediately and fetch in background', async () => {
      const newMockOverview = { ...mockOverview, totalUsers: 150 }
      const getOverviewSpy = vi.spyOn(adminDashboardService, 'getOverview').mockResolvedValue(newMockOverview)

      useAdminStore.setState({
        overview: mockOverview,
        overviewLastFetchedAt: Date.now() - 70_000, // stale
      })

      const { fetchOverview } = useAdminStore.getState()
      const result = await fetchOverview()

      expect(result).toEqual(mockOverview)
      expect(getOverviewSpy).toHaveBeenCalledOnce()

      await vi.waitFor(() => {
        expect(useAdminStore.getState().overview).toEqual(newMockOverview)
      })
    })
  })

  describe('Stale-while-revalidate pattern - fetchUsers', () => {
    it('should return cached users when fresh', async () => {
      const listUsersSpy = vi.spyOn(adminDashboardService, 'listUsers').mockResolvedValue(mockUsers)

      useAdminStore.setState({
        users: mockUsers,
        usersLastFetchedAt: Date.now() - 20_000, // fresh
      })

      const { fetchUsers } = useAdminStore.getState()
      const result = await fetchUsers()

      expect(result).toEqual(mockUsers)
      expect(listUsersSpy).not.toHaveBeenCalled()
    })
  })

  describe('Optimistic updates - updateUserRole', () => {
    it('should optimistically update user role', async () => {
      vi.spyOn(adminDashboardService, 'updateUserRole').mockResolvedValue(undefined)

      useAdminStore.setState({
        users: mockUsers,
      })

      const { updateUserRole } = useAdminStore.getState()
      const promise = updateUserRole('user-1', 'admin' as any)

      // Check optimistic update happened immediately
      const stateAfterOptimistic = useAdminStore.getState()
      expect(stateAfterOptimistic.users.find(u => u.id === 'user-1')?.role).toBe('admin')

      await promise

      // Check cache was invalidated
      const stateAfterSuccess = useAdminStore.getState()
      expect(stateAfterSuccess.usersLastFetchedAt).toBeNull()
    })

    it('should rollback optimistic update on error', async () => {
      const error = new Error('Network error')
      vi.spyOn(adminDashboardService, 'updateUserRole').mockRejectedValue(error)

      useAdminStore.setState({
        users: mockUsers,
      })

      const { updateUserRole } = useAdminStore.getState()

      await expect(updateUserRole('user-1', 'admin' as any)).rejects.toThrow('Network error')

      // Check rollback happened
      const state = useAdminStore.getState()
      expect(state.users.find(u => u.id === 'user-1')?.role).toBe('fan')
      expect(state.usersError).toEqual(error)
    })
  })

  describe('Crew management mutations', () => {
    it('should assign crew nganya and invalidate cache', async () => {
      vi.spyOn(adminDashboardService, 'assignCrewNganya').mockResolvedValue(undefined)

      useAdminStore.setState({
        crewManagementLastFetchedAt: Date.now(),
      })

      const { assignCrewNganya } = useAdminStore.getState()
      await assignCrewNganya('user-1', 'nganya-1')

      // Check cache was invalidated
      const state = useAdminStore.getState()
      expect(state.crewManagementLastFetchedAt).toBeNull()
    })

    it('should unassign crew nganya and invalidate cache', async () => {
      vi.spyOn(adminDashboardService, 'unassignCrewNganya').mockResolvedValue(undefined)

      useAdminStore.setState({
        crewManagementLastFetchedAt: Date.now(),
      })

      const { unassignCrewNganya } = useAdminStore.getState()
      await unassignCrewNganya('user-1')

      // Check cache was invalidated
      const state = useAdminStore.getState()
      expect(state.crewManagementLastFetchedAt).toBeNull()
    })

    it('should handle assignCrewNganya errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(adminDashboardService, 'assignCrewNganya').mockRejectedValue(error)

      const { assignCrewNganya } = useAdminStore.getState()

      await expect(assignCrewNganya('user-1', 'nganya-1')).rejects.toThrow('Network error')

      const state = useAdminStore.getState()
      expect(state.crewManagementError).toEqual(error)
    })
  })

  describe('Registration mutations', () => {
    it('should approve request and invalidate caches', async () => {
      vi.spyOn(nganyaRegistrationService, 'approveRequest').mockResolvedValue(undefined)

      useAdminStore.setState({
        registrationsLastFetchedAt: Date.now(),
        registrationDetailLastFetchedAt: Date.now(),
      })

      const { approveRequest } = useAdminStore.getState()
      await approveRequest('reg-1', 'Approved')

      // Check both caches were invalidated
      const state = useAdminStore.getState()
      expect(state.registrationsLastFetchedAt).toBeNull()
      expect(state.registrationDetailLastFetchedAt).toBeNull()
    })

    it('should review request and invalidate caches', async () => {
      vi.spyOn(nganyaRegistrationService, 'reviewRequest').mockResolvedValue(undefined)

      useAdminStore.setState({
        registrationsLastFetchedAt: Date.now(),
        registrationDetailLastFetchedAt: Date.now(),
      })

      const { reviewRequest } = useAdminStore.getState()
      await reviewRequest('reg-1', 'REJECTED', 'Not valid')

      // Check both caches were invalidated
      const state = useAdminStore.getState()
      expect(state.registrationsLastFetchedAt).toBeNull()
      expect(state.registrationDetailLastFetchedAt).toBeNull()
    })

    it('should handle approveRequest errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(nganyaRegistrationService, 'approveRequest').mockRejectedValue(error)

      const { approveRequest } = useAdminStore.getState()

      await expect(approveRequest('reg-1')).rejects.toThrow('Network error')

      const state = useAdminStore.getState()
      expect(state.registrationsError).toEqual(error)
    })
  })

  describe('fetchRegistrationDetail', () => {
    it('should return cached detail when same ID and fresh', async () => {
      const getAdminReviewDataSpy = vi.spyOn(nganyaRegistrationService, 'getAdminReviewData').mockResolvedValue(mockRegistrationDetail)

      useAdminStore.setState({
        registrationDetail: mockRegistrationDetail,
        registrationDetailId: 'reg-1',
        registrationDetailLastFetchedAt: Date.now() - 10_000, // fresh
      })

      const { fetchRegistrationDetail } = useAdminStore.getState()
      const result = await fetchRegistrationDetail('reg-1')

      expect(result).toEqual(mockRegistrationDetail)
      expect(getAdminReviewDataSpy).not.toHaveBeenCalled()
    })

    it('should fetch fresh detail when different ID', async () => {
      const newMockDetail = { ...mockRegistrationDetail, id: 'reg-2' }
      const getAdminReviewDataSpy = vi.spyOn(nganyaRegistrationService, 'getAdminReviewData').mockResolvedValue(newMockDetail)

      useAdminStore.setState({
        registrationDetail: mockRegistrationDetail,
        registrationDetailId: 'reg-1',
        registrationDetailLastFetchedAt: Date.now() - 10_000, // fresh but different ID
      })

      const { fetchRegistrationDetail } = useAdminStore.getState()
      const result = await fetchRegistrationDetail('reg-2')

      expect(result).toEqual(newMockDetail)
      expect(getAdminReviewDataSpy).toHaveBeenCalledWith('reg-2')
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate overview cache', () => {
      useAdminStore.setState({
        overview: mockOverview,
        overviewLastFetchedAt: Date.now(),
      })

      const { invalidateOverview } = useAdminStore.getState()
      invalidateOverview()

      expect(useAdminStore.getState().overviewLastFetchedAt).toBeNull()
    })

    it('should invalidate users cache', () => {
      useAdminStore.setState({
        users: mockUsers,
        usersLastFetchedAt: Date.now(),
      })

      const { invalidateUsers } = useAdminStore.getState()
      invalidateUsers()

      expect(useAdminStore.getState().usersLastFetchedAt).toBeNull()
    })

    it('should invalidate crew management cache', () => {
      useAdminStore.setState({
        crewManagement: mockCrewManagement,
        crewManagementLastFetchedAt: Date.now(),
      })

      const { invalidateCrewManagement } = useAdminStore.getState()
      invalidateCrewManagement()

      expect(useAdminStore.getState().crewManagementLastFetchedAt).toBeNull()
    })

    it('should invalidate registrations cache', () => {
      useAdminStore.setState({
        registrations: mockRegistrations,
        registrationsLastFetchedAt: Date.now(),
      })

      const { invalidateRegistrations } = useAdminStore.getState()
      invalidateRegistrations()

      expect(useAdminStore.getState().registrationsLastFetchedAt).toBeNull()
    })

    it('should invalidate registration detail cache', () => {
      useAdminStore.setState({
        registrationDetail: mockRegistrationDetail,
        registrationDetailLastFetchedAt: Date.now(),
      })

      const { invalidateRegistrationDetail } = useAdminStore.getState()
      invalidateRegistrationDetail()

      expect(useAdminStore.getState().registrationDetailLastFetchedAt).toBeNull()
    })

    it('should invalidate all caches', () => {
      useAdminStore.setState({
        overviewLastFetchedAt: Date.now(),
        usersLastFetchedAt: Date.now(),
        crewManagementLastFetchedAt: Date.now(),
        registrationsLastFetchedAt: Date.now(),
        registrationDetailLastFetchedAt: Date.now(),
      })

      const { invalidateAll } = useAdminStore.getState()
      invalidateAll()

      const state = useAdminStore.getState()
      expect(state.overviewLastFetchedAt).toBeNull()
      expect(state.usersLastFetchedAt).toBeNull()
      expect(state.crewManagementLastFetchedAt).toBeNull()
      expect(state.registrationsLastFetchedAt).toBeNull()
      expect(state.registrationDetailLastFetchedAt).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle fetchOverview errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(adminDashboardService, 'getOverview').mockRejectedValue(error)

      const { fetchOverview } = useAdminStore.getState()

      await expect(fetchOverview()).rejects.toThrow('Network error')

      const state = useAdminStore.getState()
      expect(state.overviewError).toEqual(error)
      expect(state.isLoadingOverview).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      vi.spyOn(adminDashboardService, 'getOverview').mockRejectedValue(new Error('Network error'))

      useAdminStore.setState({
        overview: mockOverview,
        overviewLastFetchedAt: Date.now() - 70_000, // stale
      })

      const { fetchOverview } = useAdminStore.getState()
      const result = await fetchOverview()

      // Should return stale data
      expect(result).toEqual(mockOverview)

      // Wait a bit for background fetch to fail
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stale data should still be in store
      const state = useAdminStore.getState()
      expect(state.overview).toEqual(mockOverview)
    })
  })
})
