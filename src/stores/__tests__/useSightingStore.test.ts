/**
 * Unit tests for useSightingStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Stale-while-revalidate pattern works correctly
 * - Cache invalidation works correctly
 * - Post sighting invalidates caches
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSightingStore } from '../useSightingStore'
import * as sightingsQueries from '@/lib/queries/sightings'

// Mock data
const mockUserSightings = [
  { id: 'sighting-1', nganya_id: 'nganya-1', user_id: 'user-1', created_at: new Date().toISOString() },
  { id: 'sighting-2', nganya_id: 'nganya-2', user_id: 'user-1', created_at: new Date().toISOString() },
]

const mockRecentSightings = [
  { id: 'sighting-3', nganya_id: 'nganya-1', corridor_id: 'corridor-1', created_at: new Date().toISOString() },
]

describe('useSightingStore', () => {
  beforeEach(() => {
    // Reset store state
    useSightingStore.setState({
      userSightings: [],
      recentSightings: [],
      userSightingsLastFetchedAt: null,
      recentSightingsLastFetchedAt: null,
      isLoadingUserSightings: false,
      isLoadingRecentSightings: false,
      error: null,
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return true for isUserSightingsStale when lastFetchedAt is null', () => {
      const { isUserSightingsStale } = useSightingStore.getState()
      expect(isUserSightingsStale()).toBe(true)
    })

    it('should return false for isUserSightingsStale when data is fresh (within 60s TTL)', () => {
      useSightingStore.setState({
        userSightingsLastFetchedAt: Date.now() - 30_000, // 30 seconds ago
      })

      const { isUserSightingsStale } = useSightingStore.getState()
      expect(isUserSightingsStale()).toBe(false)
    })

    it('should return true for isUserSightingsStale when data is stale (beyond 60s TTL)', () => {
      useSightingStore.setState({
        userSightingsLastFetchedAt: Date.now() - 70_000, // 70 seconds ago
      })

      const { isUserSightingsStale } = useSightingStore.getState()
      expect(isUserSightingsStale()).toBe(true)
    })

    it('should return false for isRecentSightingsStale when data is fresh (within 30s TTL)', () => {
      useSightingStore.setState({
        recentSightingsLastFetchedAt: Date.now() - 15_000, // 15 seconds ago
      })

      const { isRecentSightingsStale } = useSightingStore.getState()
      expect(isRecentSightingsStale()).toBe(false)
    })

    it('should return true for isRecentSightingsStale when data is stale (beyond 30s TTL)', () => {
      useSightingStore.setState({
        recentSightingsLastFetchedAt: Date.now() - 40_000, // 40 seconds ago
      })

      const { isRecentSightingsStale } = useSightingStore.getState()
      expect(isRecentSightingsStale()).toBe(true)
    })
  })

  describe('Stale-while-revalidate pattern', () => {
    it('should return cached user sightings immediately when fresh', async () => {
      const getMySightingsSpy = vi.spyOn(sightingsQueries, 'getMySightings').mockResolvedValue(mockUserSightings)

      // Set fresh cached data
      useSightingStore.setState({
        userSightings: mockUserSightings,
        userSightingsLastFetchedAt: Date.now() - 30_000, // 30 seconds ago (fresh)
      })

      const { fetchUserSightings } = useSightingStore.getState()
      const result = await fetchUserSightings()

      expect(result).toEqual(mockUserSightings)
      expect(getMySightingsSpy).not.toHaveBeenCalled()
    })

    it('should return stale user sightings immediately and fetch in background when stale', async () => {
      const newMockSightings = [...mockUserSightings, { id: 'sighting-4', nganya_id: 'nganya-3', user_id: 'user-1', created_at: new Date().toISOString() }]
      const getMySightingsSpy = vi.spyOn(sightingsQueries, 'getMySightings').mockResolvedValue(newMockSightings)

      // Set stale cached data
      useSightingStore.setState({
        userSightings: mockUserSightings,
        userSightingsLastFetchedAt: Date.now() - 70_000, // 70 seconds ago (stale)
      })

      const { fetchUserSightings } = useSightingStore.getState()
      const result = await fetchUserSightings()

      // Should return stale data immediately
      expect(result).toEqual(mockUserSightings)
      expect(getMySightingsSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useSightingStore.getState()
        expect(state.userSightings).toEqual(newMockSightings)
      })
    })

    it('should fetch fresh user sightings when no cache exists', async () => {
      const getMySightingsSpy = vi.spyOn(sightingsQueries, 'getMySightings').mockResolvedValue(mockUserSightings)

      // Set null to indicate no cache (empty array is truthy)
      useSightingStore.setState({
        userSightings: null as any,
        userSightingsLastFetchedAt: null,
      })

      const { fetchUserSightings } = useSightingStore.getState()
      const result = await fetchUserSightings()

      expect(result).toEqual(mockUserSightings)
      expect(getMySightingsSpy).toHaveBeenCalledOnce()
      expect(useSightingStore.getState().userSightings).toEqual(mockUserSightings)
      expect(useSightingStore.getState().userSightingsLastFetchedAt).toBeGreaterThan(0)
    })

    it('should return stale recent sightings immediately and fetch in background when stale', async () => {
      const newMockRecentSightings = [...mockRecentSightings, { id: 'sighting-5', nganya_id: 'nganya-2', corridor_id: 'corridor-1', created_at: new Date().toISOString() }]
      const getCorridorSightingsSpy = vi.spyOn(sightingsQueries, 'getCorridorSightings').mockResolvedValue(newMockRecentSightings)

      // Set stale cached data
      useSightingStore.setState({
        recentSightings: mockRecentSightings,
        recentSightingsLastFetchedAt: Date.now() - 40_000, // 40 seconds ago (stale)
      })

      const { fetchRecentSightings } = useSightingStore.getState()
      const result = await fetchRecentSightings('corridor-1')

      // Should return stale data immediately
      expect(result).toEqual(mockRecentSightings)
      expect(getCorridorSightingsSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useSightingStore.getState()
        expect(state.recentSightings).toEqual(newMockRecentSightings)
      })
    })
  })

  describe('Post sighting', () => {
    it('should post sighting and invalidate caches', async () => {
      const postSightingSpy = vi.spyOn(sightingsQueries, 'postSighting').mockResolvedValue(undefined)

      useSightingStore.setState({
        userSightingsLastFetchedAt: Date.now(),
        recentSightingsLastFetchedAt: Date.now(),
      })

      const sighting = {
        nganya_id: 'nganya-1',
        corridor_id: 'corridor-1',
        location: { lat: 0, lng: 0 },
        direction: 'INBOUND',
        note: 'Test sighting',
        media_urls: [],
      }

      const { postSighting } = useSightingStore.getState()
      await postSighting(sighting)

      expect(postSightingSpy).toHaveBeenCalledWith(sighting)

      // Check both caches were invalidated
      const state = useSightingStore.getState()
      expect(state.userSightingsLastFetchedAt).toBeNull()
      expect(state.recentSightingsLastFetchedAt).toBeNull()
    })

    it('should handle post sighting errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(sightingsQueries, 'postSighting').mockRejectedValue(error)

      const sighting = {
        nganya_id: 'nganya-1',
        corridor_id: 'corridor-1',
        location: { lat: 0, lng: 0 },
      }

      const { postSighting } = useSightingStore.getState()

      await expect(postSighting(sighting)).rejects.toThrow('Network error')

      const state = useSightingStore.getState()
      expect(state.error).toEqual(error)
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate user sightings cache', () => {
      useSightingStore.setState({
        userSightings: mockUserSightings,
        userSightingsLastFetchedAt: Date.now(),
      })

      const { invalidateUserSightings } = useSightingStore.getState()
      invalidateUserSightings()

      const state = useSightingStore.getState()
      expect(state.userSightingsLastFetchedAt).toBeNull()
    })

    it('should invalidate recent sightings cache', () => {
      useSightingStore.setState({
        recentSightings: mockRecentSightings,
        recentSightingsLastFetchedAt: Date.now(),
      })

      const { invalidateRecentSightings } = useSightingStore.getState()
      invalidateRecentSightings()

      const state = useSightingStore.getState()
      expect(state.recentSightingsLastFetchedAt).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle fetchUserSightings errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(sightingsQueries, 'getMySightings').mockRejectedValue(error)

      // Set null to indicate no cache
      useSightingStore.setState({
        userSightings: null as any,
        userSightingsLastFetchedAt: null,
      })

      const { fetchUserSightings } = useSightingStore.getState()

      await expect(fetchUserSightings()).rejects.toThrow('Network error')

      const state = useSightingStore.getState()
      expect(state.error).toEqual(error)
      expect(state.isLoadingUserSightings).toBe(false)
    })

    it('should handle fetchRecentSightings errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(sightingsQueries, 'getCorridorSightings').mockRejectedValue(error)

      // Set null to indicate no cache
      useSightingStore.setState({
        recentSightings: null as any,
        recentSightingsLastFetchedAt: null,
      })

      const { fetchRecentSightings } = useSightingStore.getState()

      await expect(fetchRecentSightings('corridor-1')).rejects.toThrow('Network error')

      const state = useSightingStore.getState()
      expect(state.error).toEqual(error)
      expect(state.isLoadingRecentSightings).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      vi.spyOn(sightingsQueries, 'getMySightings').mockRejectedValue(new Error('Network error'))

      // Set stale cached data
      useSightingStore.setState({
        userSightings: mockUserSightings,
        userSightingsLastFetchedAt: Date.now() - 70_000, // stale
      })

      const { fetchUserSightings } = useSightingStore.getState()
      const result = await fetchUserSightings()

      // Should return stale data
      expect(result).toEqual(mockUserSightings)

      // Wait a bit for background fetch to fail
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stale data should still be in store
      const state = useSightingStore.getState()
      expect(state.userSightings).toEqual(mockUserSightings)
    })
  })
})
