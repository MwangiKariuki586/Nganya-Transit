/**
 * Unit tests for useFollowStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Stale-while-revalidate pattern works correctly
 * - Optimistic updates work correctly
 * - Rollback on error works correctly
 * - Cache invalidation works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFollowStore } from '../useFollowStore'
import * as followsQueries from '@/lib/queries/follows'

// Mock data
const mockFollows = [
  { id: 'follow-1', nganya_id: 'nganya-1', user_id: 'user-1' },
  { id: 'follow-2', nganya_id: 'nganya-2', user_id: 'user-1' },
]

describe('useFollowStore', () => {
  beforeEach(() => {
    // Reset store state
    useFollowStore.setState({
      followedNganyas: [],
      followedIds: new Set(),
      lastFetchedAt: null,
      isLoading: false,
      error: null,
      optimisticFollows: new Set(),
      optimisticUnfollows: new Set(),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return true for isStale when lastFetchedAt is null', () => {
      const { isStale } = useFollowStore.getState()
      expect(isStale()).toBe(true)
    })

    it('should return false for isStale when data is fresh (within 45s TTL)', () => {
      useFollowStore.setState({
        lastFetchedAt: Date.now() - 20_000, // 20 seconds ago
      })

      const { isStale } = useFollowStore.getState()
      expect(isStale()).toBe(false)
    })

    it('should return true for isStale when data is stale (beyond 45s TTL)', () => {
      useFollowStore.setState({
        lastFetchedAt: Date.now() - 50_000, // 50 seconds ago
      })

      const { isStale } = useFollowStore.getState()
      expect(isStale()).toBe(true)
    })
  })

  describe('Stale-while-revalidate pattern', () => {
    it('should return cached follows immediately when fresh', async () => {
      const getMyFollowsSpy = vi.spyOn(followsQueries, 'getMyFollows').mockResolvedValue(mockFollows)

      // Set fresh cached data
      useFollowStore.setState({
        followedNganyas: mockFollows,
        followedIds: new Set(['nganya-1', 'nganya-2']),
        lastFetchedAt: Date.now() - 20_000, // 20 seconds ago (fresh)
      })

      const { fetchFollowedNganyas } = useFollowStore.getState()
      const result = await fetchFollowedNganyas()

      expect(result).toEqual(mockFollows)
      expect(getMyFollowsSpy).not.toHaveBeenCalled() // Should not fetch
    })

    it('should return stale follows immediately and fetch in background when stale', async () => {
      const newMockFollows = [...mockFollows, { id: 'follow-3', nganya_id: 'nganya-3', user_id: 'user-1' }]
      const getMyFollowsSpy = vi.spyOn(followsQueries, 'getMyFollows').mockResolvedValue(newMockFollows)

      // Set stale cached data
      useFollowStore.setState({
        followedNganyas: mockFollows,
        followedIds: new Set(['nganya-1', 'nganya-2']),
        lastFetchedAt: Date.now() - 50_000, // 50 seconds ago (stale)
      })

      const { fetchFollowedNganyas } = useFollowStore.getState()
      const result = await fetchFollowedNganyas()

      // Should return stale data immediately
      expect(result).toEqual(mockFollows)
      expect(getMyFollowsSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useFollowStore.getState()
        expect(state.followedNganyas).toEqual(newMockFollows)
        expect(state.followedIds).toEqual(new Set(['nganya-1', 'nganya-2', 'nganya-3']))
      })
    })

    it('should fetch fresh follows when no cache exists', async () => {
      const getMyFollowsSpy = vi.spyOn(followsQueries, 'getMyFollows').mockResolvedValue(mockFollows)

      // Set null to indicate no cache (empty array is truthy and treated as cached data)
      useFollowStore.setState({
        followedNganyas: null as any,
        lastFetchedAt: null,
      })

      const { fetchFollowedNganyas } = useFollowStore.getState()
      const result = await fetchFollowedNganyas()

      expect(result).toEqual(mockFollows)
      expect(getMyFollowsSpy).toHaveBeenCalledOnce()
      expect(useFollowStore.getState().followedNganyas).toEqual(mockFollows)
      expect(useFollowStore.getState().followedIds).toEqual(new Set(['nganya-1', 'nganya-2']))
      expect(useFollowStore.getState().lastFetchedAt).toBeGreaterThan(0)
    })
  })

  describe('Optimistic updates - followNganya', () => {
    it('should optimistically add nganya to followedIds', async () => {
      vi.spyOn(followsQueries, 'followNganya').mockResolvedValue(undefined)

      useFollowStore.setState({
        followedIds: new Set(['nganya-1']),
      })

      const { followNganya } = useFollowStore.getState()
      const promise = followNganya('nganya-2')

      // Check optimistic update happened immediately
      const stateAfterOptimistic = useFollowStore.getState()
      expect(stateAfterOptimistic.followedIds.has('nganya-2')).toBe(true)
      expect(stateAfterOptimistic.optimisticFollows.has('nganya-2')).toBe(true)

      await promise

      // Check optimistic tracking removed after success
      const stateAfterSuccess = useFollowStore.getState()
      expect(stateAfterSuccess.followedIds.has('nganya-2')).toBe(true)
      expect(stateAfterSuccess.optimisticFollows.has('nganya-2')).toBe(false)
    })

    it('should rollback optimistic update on error', async () => {
      const error = new Error('Network error')
      vi.spyOn(followsQueries, 'followNganya').mockRejectedValue(error)

      useFollowStore.setState({
        followedIds: new Set(['nganya-1']),
      })

      const { followNganya } = useFollowStore.getState()

      await expect(followNganya('nganya-2')).rejects.toThrow('Network error')

      // Check rollback happened
      const state = useFollowStore.getState()
      expect(state.followedIds.has('nganya-2')).toBe(false)
      expect(state.optimisticFollows.has('nganya-2')).toBe(false)
      expect(state.error).toEqual(error)
    })

    it('should invalidate cache after successful follow', async () => {
      vi.spyOn(followsQueries, 'followNganya').mockResolvedValue(undefined)

      useFollowStore.setState({
        followedIds: new Set(['nganya-1']),
        lastFetchedAt: Date.now(),
      })

      const { followNganya } = useFollowStore.getState()
      await followNganya('nganya-2')

      // Check cache was invalidated
      const state = useFollowStore.getState()
      expect(state.lastFetchedAt).toBeNull()
    })
  })

  describe('Optimistic updates - unfollowNganya', () => {
    it('should optimistically remove nganya from followedIds', async () => {
      vi.spyOn(followsQueries, 'unfollowNganya').mockResolvedValue(undefined)

      useFollowStore.setState({
        followedIds: new Set(['nganya-1', 'nganya-2']),
      })

      const { unfollowNganya } = useFollowStore.getState()
      const promise = unfollowNganya('nganya-2')

      // Check optimistic update happened immediately
      const stateAfterOptimistic = useFollowStore.getState()
      expect(stateAfterOptimistic.followedIds.has('nganya-2')).toBe(false)
      expect(stateAfterOptimistic.optimisticUnfollows.has('nganya-2')).toBe(true)

      await promise

      // Check optimistic tracking removed after success
      const stateAfterSuccess = useFollowStore.getState()
      expect(stateAfterSuccess.followedIds.has('nganya-2')).toBe(false)
      expect(stateAfterSuccess.optimisticUnfollows.has('nganya-2')).toBe(false)
    })

    it('should rollback optimistic update on error', async () => {
      const error = new Error('Network error')
      vi.spyOn(followsQueries, 'unfollowNganya').mockRejectedValue(error)

      useFollowStore.setState({
        followedIds: new Set(['nganya-1', 'nganya-2']),
      })

      const { unfollowNganya } = useFollowStore.getState()

      await expect(unfollowNganya('nganya-2')).rejects.toThrow('Network error')

      // Check rollback happened
      const state = useFollowStore.getState()
      expect(state.followedIds.has('nganya-2')).toBe(true)
      expect(state.optimisticUnfollows.has('nganya-2')).toBe(false)
      expect(state.error).toEqual(error)
    })

    it('should invalidate cache after successful unfollow', async () => {
      vi.spyOn(followsQueries, 'unfollowNganya').mockResolvedValue(undefined)

      useFollowStore.setState({
        followedIds: new Set(['nganya-1', 'nganya-2']),
        lastFetchedAt: Date.now(),
      })

      const { unfollowNganya } = useFollowStore.getState()
      await unfollowNganya('nganya-2')

      // Check cache was invalidated
      const state = useFollowStore.getState()
      expect(state.lastFetchedAt).toBeNull()
    })
  })

  describe('isFollowing selector', () => {
    it('should return true when nganya is in followedIds', () => {
      useFollowStore.setState({
        followedIds: new Set(['nganya-1', 'nganya-2']),
      })

      const { isFollowing } = useFollowStore.getState()
      expect(isFollowing('nganya-1')).toBe(true)
      expect(isFollowing('nganya-2')).toBe(true)
    })

    it('should return false when nganya is not in followedIds', () => {
      useFollowStore.setState({
        followedIds: new Set(['nganya-1']),
      })

      const { isFollowing } = useFollowStore.getState()
      expect(isFollowing('nganya-2')).toBe(false)
    })

    it('should reflect optimistic follow immediately', async () => {
      vi.spyOn(followsQueries, 'followNganya').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      useFollowStore.setState({
        followedIds: new Set(['nganya-1']),
      })

      const { followNganya, isFollowing } = useFollowStore.getState()
      const promise = followNganya('nganya-2')

      // Should reflect optimistic update immediately
      expect(isFollowing('nganya-2')).toBe(true)

      await promise
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate cache', () => {
      useFollowStore.setState({
        followedNganyas: mockFollows,
        lastFetchedAt: Date.now(),
      })

      const { invalidate } = useFollowStore.getState()
      invalidate()

      const state = useFollowStore.getState()
      expect(state.lastFetchedAt).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle fetchFollowedNganyas errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(followsQueries, 'getMyFollows').mockRejectedValue(error)

      // Set null to indicate no cache
      useFollowStore.setState({
        followedNganyas: null as any,
        lastFetchedAt: null,
      })

      const { fetchFollowedNganyas } = useFollowStore.getState()

      await expect(fetchFollowedNganyas()).rejects.toThrow('Network error')

      const state = useFollowStore.getState()
      expect(state.error).toEqual(error)
      expect(state.isLoading).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      vi.spyOn(followsQueries, 'getMyFollows').mockRejectedValue(new Error('Network error'))

      // Set stale cached data
      useFollowStore.setState({
        followedNganyas: mockFollows,
        followedIds: new Set(['nganya-1', 'nganya-2']),
        lastFetchedAt: Date.now() - 50_000, // stale
      })

      const { fetchFollowedNganyas } = useFollowStore.getState()
      const result = await fetchFollowedNganyas()

      // Should return stale data
      expect(result).toEqual(mockFollows)

      // Wait a bit for background fetch to fail
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stale data should still be in store
      const state = useFollowStore.getState()
      expect(state.followedNganyas).toEqual(mockFollows)
    })
  })
})
