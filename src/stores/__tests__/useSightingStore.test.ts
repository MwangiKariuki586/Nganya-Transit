/**
 * Unit tests for useSightingStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Stale-while-revalidate pattern works correctly
 * - Cache invalidation works correctly
 * - Post sighting invalidates caches
 * - Parameter-keyed caching for recent sightings per corridor
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

function resetStore() {
  useSightingStore.setState({
    userSightings: [],
    recentSightingsCache: new Map(),
    currentCorridorKey: '',
    userSightingsLastFetchedAt: null,
    isLoadingUserSightings: false,
    isLoadingRecentSightings: false,
    error: null,
  })
}

describe('useSightingStore', () => {
  beforeEach(() => {
    resetStore()
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
        userSightingsLastFetchedAt: Date.now() - 30_000,
      })

      const { isUserSightingsStale } = useSightingStore.getState()
      expect(isUserSightingsStale()).toBe(false)
    })

    it('should return true for isUserSightingsStale when data is stale (beyond 60s TTL)', () => {
      useSightingStore.setState({
        userSightingsLastFetchedAt: Date.now() - 70_000,
      })

      const { isUserSightingsStale } = useSightingStore.getState()
      expect(isUserSightingsStale()).toBe(true)
    })

    it('should return true for isRecentSightingsStale when no cache for current corridor', () => {
      const { isRecentSightingsStale } = useSightingStore.getState()
      expect(isRecentSightingsStale()).toBe(true)
    })

    it('should return false for isRecentSightingsStale when corridor cache is fresh', async () => {
      vi.spyOn(sightingsQueries, 'getCorridorSightings').mockResolvedValue(mockRecentSightings)
      await useSightingStore.getState().fetchRecentSightings('corridor-1')

      const { isRecentSightingsStale } = useSightingStore.getState()
      expect(isRecentSightingsStale()).toBe(false)
    })
  })

  describe('Stale-while-revalidate pattern', () => {
    it('should return cached user sightings immediately when fresh', async () => {
      const getMySightingsSpy = vi.spyOn(sightingsQueries, 'getMySightings').mockResolvedValue(mockUserSightings)

      useSightingStore.setState({
        userSightings: mockUserSightings,
        userSightingsLastFetchedAt: Date.now() - 30_000,
      })

      const result = await useSightingStore.getState().fetchUserSightings()

      expect(result).toEqual(mockUserSightings)
      expect(getMySightingsSpy).not.toHaveBeenCalled()
    })

    it('should return stale user sightings immediately and fetch in background when stale', async () => {
      const newMockSightings = [...mockUserSightings, { id: 'sighting-4', nganya_id: 'nganya-3', user_id: 'user-1', created_at: new Date().toISOString() }]
      const getMySightingsSpy = vi.spyOn(sightingsQueries, 'getMySightings').mockResolvedValue(newMockSightings)

      useSightingStore.setState({
        userSightings: mockUserSightings,
        userSightingsLastFetchedAt: Date.now() - 70_000,
      })

      const result = await useSightingStore.getState().fetchUserSightings()

      expect(result).toEqual(mockUserSightings)
      expect(getMySightingsSpy).toHaveBeenCalledOnce()

      await vi.waitFor(() => {
        const state = useSightingStore.getState()
        expect(state.userSightings).toEqual(newMockSightings)
      })
    })

    it('should return stale recent sightings immediately and fetch in background when stale', async () => {
      const newMockRecentSightings = [...mockRecentSightings, { id: 'sighting-5', nganya_id: 'nganya-2', corridor_id: 'corridor-1', created_at: new Date().toISOString() }]
      vi.spyOn(sightingsQueries, 'getCorridorSightings')
        .mockResolvedValueOnce(mockRecentSightings)
        .mockResolvedValueOnce(newMockRecentSightings)

      // Populate cache
      await useSightingStore.getState().fetchRecentSightings('corridor-1')

      // Make stale
      const staleCache = new Map(useSightingStore.getState().recentSightingsCache)
      staleCache.set('corridor-1', { data: mockRecentSightings, fetchedAt: Date.now() - 40_000 })
      useSightingStore.setState({ recentSightingsCache: staleCache })

      const result = await useSightingStore.getState().fetchRecentSightings('corridor-1')

      expect(result).toEqual(mockRecentSightings)

      await vi.waitFor(() => {
        const state = useSightingStore.getState()
        expect(state.getRecentSightings()).toEqual(newMockRecentSightings)
      })
    })
  })

  describe('Parameter-keyed caching', () => {
    it('should cache recent sightings separately per corridor', async () => {
      const corridor1Sightings = [{ id: 's1', corridor_id: 'c1' }]
      const corridor2Sightings = [{ id: 's2', corridor_id: 'c2' }]

      vi.spyOn(sightingsQueries, 'getCorridorSightings')
        .mockResolvedValueOnce(corridor1Sightings)
        .mockResolvedValueOnce(corridor2Sightings)

      await useSightingStore.getState().fetchRecentSightings('c1')
      expect(useSightingStore.getState().getRecentSightings()).toEqual(corridor1Sightings)

      await useSightingStore.getState().fetchRecentSightings('c2')
      expect(useSightingStore.getState().getRecentSightings()).toEqual(corridor2Sightings)

      // Switching back to c1 should use cached data
      const spy = vi.spyOn(sightingsQueries, 'getCorridorSightings')
      spy.mockClear()
      const result = await useSightingStore.getState().fetchRecentSightings('c1')
      expect(result).toEqual(corridor1Sightings)
      expect(useSightingStore.getState().getRecentSightings()).toEqual(corridor1Sightings)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('Post sighting', () => {
    it('should post sighting and invalidate caches', async () => {
      const postSightingSpy = vi.spyOn(sightingsQueries, 'postSighting').mockResolvedValue(undefined)

      useSightingStore.setState({
        userSightingsLastFetchedAt: Date.now(),
      })

      const sighting = {
        nganya_id: 'nganya-1',
        corridor_id: 'corridor-1',
        location: { lat: 0, lng: 0 },
        direction: 'INBOUND',
        note: 'Test sighting',
        media_urls: [],
      }

      await useSightingStore.getState().postSighting(sighting)

      expect(postSightingSpy).toHaveBeenCalledWith(sighting)

      const state = useSightingStore.getState()
      expect(state.userSightingsLastFetchedAt).toBeNull()
      expect(state.recentSightingsCache.size).toBe(0)
    })

    it('should handle post sighting errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(sightingsQueries, 'postSighting').mockRejectedValue(error)

      const sighting = {
        nganya_id: 'nganya-1',
        corridor_id: 'corridor-1',
        location: { lat: 0, lng: 0 },
      }

      await expect(useSightingStore.getState().postSighting(sighting)).rejects.toThrow('Network error')

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

      useSightingStore.getState().invalidateUserSightings()

      const state = useSightingStore.getState()
      expect(state.userSightingsLastFetchedAt).toBeNull()
    })

    it('should invalidate all recent sightings cache entries', async () => {
      vi.spyOn(sightingsQueries, 'getCorridorSightings').mockResolvedValue(mockRecentSightings)

      await useSightingStore.getState().fetchRecentSightings('c1')
      await useSightingStore.getState().fetchRecentSightings('c2')

      useSightingStore.getState().invalidateRecentSightings()

      expect(useSightingStore.getState().recentSightingsCache.size).toBe(0)
    })
  })

  describe('Error handling', () => {
    it('should handle fetchUserSightings errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(sightingsQueries, 'getMySightings').mockRejectedValue(error)

      useSightingStore.setState({
        userSightings: null as any,
        userSightingsLastFetchedAt: null,
      })

      await expect(useSightingStore.getState().fetchUserSightings()).rejects.toThrow('Network error')

      const state = useSightingStore.getState()
      expect(state.error).toEqual(error)
      expect(state.isLoadingUserSightings).toBe(false)
    })

    it('should handle fetchRecentSightings errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(sightingsQueries, 'getCorridorSightings').mockRejectedValue(error)

      await expect(useSightingStore.getState().fetchRecentSightings('corridor-1')).rejects.toThrow('Network error')

      const state = useSightingStore.getState()
      expect(state.error).toEqual(error)
      expect(state.isLoadingRecentSightings).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      vi.spyOn(sightingsQueries, 'getMySightings').mockRejectedValue(new Error('Network error'))

      useSightingStore.setState({
        userSightings: mockUserSightings,
        userSightingsLastFetchedAt: Date.now() - 70_000,
      })

      const result = await useSightingStore.getState().fetchUserSightings()
      expect(result).toEqual(mockUserSightings)

      await new Promise(resolve => setTimeout(resolve, 100))

      const state = useSightingStore.getState()
      expect(state.userSightings).toEqual(mockUserSightings)
    })
  })
})
