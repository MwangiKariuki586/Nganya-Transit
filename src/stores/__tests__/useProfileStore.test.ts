/**
 * Unit tests for useProfileStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Stale-while-revalidate pattern works correctly
 * - Optimistic updates work correctly
 * - Rollback on error works correctly
 * - Cache invalidation works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useProfileStore } from '../useProfileStore'
import * as profileQueries from '@/lib/queries/profile'

// Mock data
const mockAuthUser = {
  id: 'user-1',
  email: 'test@example.com',
}

const mockProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  full_name: 'Test User',
  handle: 'testuser',
}

describe('useProfileStore', () => {
  beforeEach(() => {
    // Reset store state
    useProfileStore.setState({
      authUser: null,
      profile: null,
      lastFetchedAt: null,
      isLoading: false,
      error: null,
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return true for isStale when lastFetchedAt is null', () => {
      const { isStale } = useProfileStore.getState()
      expect(isStale()).toBe(true)
    })

    it('should return false for isStale when data is fresh (within 60s TTL)', () => {
      useProfileStore.setState({
        lastFetchedAt: Date.now() - 30_000, // 30 seconds ago
      })

      const { isStale } = useProfileStore.getState()
      expect(isStale()).toBe(false)
    })

    it('should return true for isStale when data is stale (beyond 60s TTL)', () => {
      useProfileStore.setState({
        lastFetchedAt: Date.now() - 70_000, // 70 seconds ago
      })

      const { isStale } = useProfileStore.getState()
      expect(isStale()).toBe(true)
    })
  })

  describe('Stale-while-revalidate pattern', () => {
    it('should return cached profile immediately when fresh', async () => {
      const getCurrentAuthUserSpy = vi.spyOn(profileQueries, 'getCurrentAuthUser').mockResolvedValue(mockAuthUser)
      const getCurrentUserProfileSpy = vi.spyOn(profileQueries, 'getCurrentUserProfile').mockResolvedValue(mockProfile)

      // Set fresh cached data
      useProfileStore.setState({
        authUser: mockAuthUser,
        profile: mockProfile,
        lastFetchedAt: Date.now() - 30_000, // 30 seconds ago (fresh)
      })

      const { fetchProfile } = useProfileStore.getState()
      const result = await fetchProfile()

      expect(result).toEqual(mockProfile)
      expect(getCurrentAuthUserSpy).not.toHaveBeenCalled()
      expect(getCurrentUserProfileSpy).not.toHaveBeenCalled()
    })

    it('should return stale profile immediately and fetch in background when stale', async () => {
      const newMockProfile = { ...mockProfile, full_name: 'Updated User' }
      const getCurrentAuthUserSpy = vi.spyOn(profileQueries, 'getCurrentAuthUser').mockResolvedValue(mockAuthUser)
      const getCurrentUserProfileSpy = vi.spyOn(profileQueries, 'getCurrentUserProfile').mockResolvedValue(newMockProfile)

      // Set stale cached data
      useProfileStore.setState({
        authUser: mockAuthUser,
        profile: mockProfile,
        lastFetchedAt: Date.now() - 70_000, // 70 seconds ago (stale)
      })

      const { fetchProfile } = useProfileStore.getState()
      const result = await fetchProfile()

      // Should return stale data immediately
      expect(result).toEqual(mockProfile)
      expect(getCurrentAuthUserSpy).toHaveBeenCalledOnce()
      expect(getCurrentUserProfileSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useProfileStore.getState()
        expect(state.profile).toEqual(newMockProfile)
      })
    })

    it('should fetch fresh profile when no cache exists', async () => {
      const getCurrentAuthUserSpy = vi.spyOn(profileQueries, 'getCurrentAuthUser').mockResolvedValue(mockAuthUser)
      const getCurrentUserProfileSpy = vi.spyOn(profileQueries, 'getCurrentUserProfile').mockResolvedValue(mockProfile)

      const { fetchProfile } = useProfileStore.getState()
      const result = await fetchProfile()

      expect(result).toEqual(mockProfile)
      expect(getCurrentAuthUserSpy).toHaveBeenCalledOnce()
      expect(getCurrentUserProfileSpy).toHaveBeenCalledOnce()
      expect(useProfileStore.getState().authUser).toEqual(mockAuthUser)
      expect(useProfileStore.getState().profile).toEqual(mockProfile)
      expect(useProfileStore.getState().lastFetchedAt).toBeGreaterThan(0)
    })
  })

  describe('Optimistic updates', () => {
    it('should optimistically update profile', async () => {
      vi.spyOn(profileQueries, 'updateCurrentUserProfile').mockResolvedValue(undefined)

      useProfileStore.setState({
        profile: mockProfile,
      })

      const updates = { full_name: 'Updated Name', handle: 'updatedhandle' }
      const { updateProfile } = useProfileStore.getState()
      const promise = updateProfile(updates)

      // Check optimistic update happened immediately
      const stateAfterOptimistic = useProfileStore.getState()
      expect(stateAfterOptimistic.profile).toEqual({ ...mockProfile, ...updates })

      await promise

      // Check cache was invalidated after success
      const stateAfterSuccess = useProfileStore.getState()
      expect(stateAfterSuccess.lastFetchedAt).toBeNull()
    })

    it('should rollback optimistic update on error', async () => {
      const error = new Error('Network error')
      vi.spyOn(profileQueries, 'updateCurrentUserProfile').mockRejectedValue(error)

      useProfileStore.setState({
        profile: mockProfile,
      })

      const updates = { full_name: 'Updated Name', handle: 'updatedhandle' }
      const { updateProfile } = useProfileStore.getState()

      await expect(updateProfile(updates)).rejects.toThrow('Network error')

      // Check rollback happened
      const state = useProfileStore.getState()
      expect(state.profile).toEqual(mockProfile)
      expect(state.error).toEqual(error)
    })

    it('should handle partial updates', async () => {
      vi.spyOn(profileQueries, 'updateCurrentUserProfile').mockResolvedValue(undefined)

      useProfileStore.setState({
        profile: mockProfile,
      })

      const updates = { full_name: 'Updated Name' }
      const { updateProfile } = useProfileStore.getState()
      await updateProfile(updates as any)

      // Check only specified fields were updated
      const stateAfterOptimistic = useProfileStore.getState()
      expect(stateAfterOptimistic.profile).toEqual({
        ...mockProfile,
        full_name: 'Updated Name',
      })
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate cache', () => {
      useProfileStore.setState({
        authUser: mockAuthUser,
        profile: mockProfile,
        lastFetchedAt: Date.now(),
      })

      const { invalidate } = useProfileStore.getState()
      invalidate()

      const state = useProfileStore.getState()
      expect(state.lastFetchedAt).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle fetchProfile errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(profileQueries, 'getCurrentAuthUser').mockRejectedValue(error)
      vi.spyOn(profileQueries, 'getCurrentUserProfile').mockResolvedValue(mockProfile)

      const { fetchProfile } = useProfileStore.getState()

      await expect(fetchProfile()).rejects.toThrow('Network error')

      const state = useProfileStore.getState()
      expect(state.error).toEqual(error)
      expect(state.isLoading).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      vi.spyOn(profileQueries, 'getCurrentAuthUser').mockRejectedValue(new Error('Network error'))
      vi.spyOn(profileQueries, 'getCurrentUserProfile').mockResolvedValue(mockProfile)

      // Set stale cached data
      useProfileStore.setState({
        authUser: mockAuthUser,
        profile: mockProfile,
        lastFetchedAt: Date.now() - 70_000, // stale
      })

      const { fetchProfile } = useProfileStore.getState()
      const result = await fetchProfile()

      // Should return stale data
      expect(result).toEqual(mockProfile)

      // Wait a bit for background fetch to fail
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stale data should still be in store
      const state = useProfileStore.getState()
      expect(state.profile).toEqual(mockProfile)
    })
  })
})
