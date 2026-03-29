/**
 * Unit tests for useNganyaStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Stale-while-revalidate pattern works correctly
 * - Request deduplication works correctly
 * - Cache invalidation works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNganyaStore } from '../useNganyaStore'
import * as discoverQueries from '@/lib/queries/discover'
import * as liveQueries from '@/lib/queries/live'

// Mock data
const mockNganyas = [
  { id: 'nganya-1', name: 'Nganya 1', corridor_id: 'corridor-1' },
  { id: 'nganya-2', name: 'Nganya 2', corridor_id: 'corridor-2' },
]

const mockCorridors = [
  { id: 'corridor-1', name: 'Thika Road' },
  { id: 'corridor-2', name: 'Ngong Road' },
]

const mockLiveNganyas = [
  { id: 'live-1', nganya_id: 'nganya-1', corridor_id: 'corridor-1', status: 'LIVE' },
]

describe('useNganyaStore', () => {
  beforeEach(() => {
    // Reset store state
    useNganyaStore.setState({
      nganyas: [],
      corridors: [],
      liveNganyas: [],
      nganyasLastFetchedAt: null,
      corridorsLastFetchedAt: null,
      liveNganyasLastFetchedAt: null,
      isLoadingNganyas: false,
      isLoadingCorridors: false,
      isLoadingLiveNganyas: false,
      nganyasError: null,
      corridorsError: null,
      liveNganyasError: null,
      pendingNganyaRequests: new Map(),
      pendingCorridorRequests: new Map(),
      pendingLiveNganyaRequests: new Map(),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return true for isNganyasStale when lastFetchedAt is null', () => {
      const { isNganyasStale } = useNganyaStore.getState()
      expect(isNganyasStale()).toBe(true)
    })

    it('should return false for isNganyasStale when data is fresh (within 60s TTL)', () => {
      useNganyaStore.setState({
        nganyasLastFetchedAt: Date.now() - 30_000, // 30 seconds ago
      })

      const { isNganyasStale } = useNganyaStore.getState()
      expect(isNganyasStale()).toBe(false)
    })

    it('should return true for isNganyasStale when data is stale (beyond 60s TTL)', () => {
      useNganyaStore.setState({
        nganyasLastFetchedAt: Date.now() - 70_000, // 70 seconds ago
      })

      const { isNganyasStale } = useNganyaStore.getState()
      expect(isNganyasStale()).toBe(true)
    })

    it('should return false for isCorridorsStale when data is fresh (within 120s TTL)', () => {
      useNganyaStore.setState({
        corridorsLastFetchedAt: Date.now() - 60_000, // 60 seconds ago
      })

      const { isCorridorsStale } = useNganyaStore.getState()
      expect(isCorridorsStale()).toBe(false)
    })

    it('should return true for isCorridorsStale when data is stale (beyond 120s TTL)', () => {
      useNganyaStore.setState({
        corridorsLastFetchedAt: Date.now() - 130_000, // 130 seconds ago
      })

      const { isCorridorsStale } = useNganyaStore.getState()
      expect(isCorridorsStale()).toBe(true)
    })

    it('should return false for isLiveNganyasStale when data is fresh (within 30s TTL)', () => {
      useNganyaStore.setState({
        liveNganyasLastFetchedAt: Date.now() - 15_000, // 15 seconds ago
      })

      const { isLiveNganyasStale } = useNganyaStore.getState()
      expect(isLiveNganyasStale()).toBe(false)
    })

    it('should return true for isLiveNganyasStale when data is stale (beyond 30s TTL)', () => {
      useNganyaStore.setState({
        liveNganyasLastFetchedAt: Date.now() - 40_000, // 40 seconds ago
      })

      const { isLiveNganyasStale } = useNganyaStore.getState()
      expect(isLiveNganyasStale()).toBe(true)
    })
  })

  describe('Stale-while-revalidate pattern', () => {
    it('should return cached nganyas immediately when fresh', async () => {
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)

      // Set fresh cached data
      useNganyaStore.setState({
        nganyas: mockNganyas,
        nganyasLastFetchedAt: Date.now() - 30_000, // 30 seconds ago (fresh)
      })

      const { fetchNganyas } = useNganyaStore.getState()
      const result = await fetchNganyas()

      expect(result).toEqual(mockNganyas)
      expect(searchNganyasSpy).not.toHaveBeenCalled() // Should not fetch
    })

    it('should return stale nganyas immediately and fetch in background when stale', async () => {
      const newMockNganyas = [...mockNganyas, { id: 'nganya-3', name: 'Nganya 3', corridor_id: 'corridor-1' }]
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(newMockNganyas)

      // Set stale cached data
      useNganyaStore.setState({
        nganyas: mockNganyas,
        nganyasLastFetchedAt: Date.now() - 70_000, // 70 seconds ago (stale)
      })

      const { fetchNganyas } = useNganyaStore.getState()
      const result = await fetchNganyas()

      // Should return stale data immediately
      expect(result).toEqual(mockNganyas)
      expect(searchNganyasSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useNganyaStore.getState()
        expect(state.nganyas).toEqual(newMockNganyas)
      })
    })

    it('should fetch fresh corridors when no cache exists', async () => {
      const getCorridorsSpy = vi.spyOn(discoverQueries, 'getCorridors').mockResolvedValue(mockCorridors)

      const { fetchCorridors } = useNganyaStore.getState()
      const result = await fetchCorridors()

      expect(result).toEqual(mockCorridors)
      expect(getCorridorsSpy).toHaveBeenCalledOnce()
      expect(useNganyaStore.getState().corridors).toEqual(mockCorridors)
      expect(useNganyaStore.getState().corridorsLastFetchedAt).toBeGreaterThan(0)
    })

    it('should return stale live nganyas immediately and fetch in background when stale', async () => {
      const newMockLiveNganyas = [...mockLiveNganyas, { id: 'live-2', nganya_id: 'nganya-2', corridor_id: 'corridor-2', status: 'LIVE' }]
      const getLiveNowSpy = vi.spyOn(liveQueries, 'getLiveNow').mockResolvedValue(newMockLiveNganyas)

      // Set stale cached data
      useNganyaStore.setState({
        liveNganyas: mockLiveNganyas,
        liveNganyasLastFetchedAt: Date.now() - 40_000, // 40 seconds ago (stale)
      })

      const { fetchLiveNganyas } = useNganyaStore.getState()
      const result = await fetchLiveNganyas()

      // Should return stale data immediately
      expect(result).toEqual(mockLiveNganyas)
      expect(getLiveNowSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useNganyaStore.getState()
        expect(state.liveNganyas).toEqual(newMockLiveNganyas)
      })
    })
  })

  describe('Request deduplication', () => {
    it('should deduplicate concurrent fetchNganyas requests', async () => {
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockNganyas
      })

      const { fetchNganyas } = useNganyaStore.getState()

      // Make 3 concurrent requests
      const [result1, result2, result3] = await Promise.all([
        fetchNganyas('test'),
        fetchNganyas('test'),
        fetchNganyas('test'),
      ])

      // Should only call API once
      expect(searchNganyasSpy).toHaveBeenCalledOnce()
      expect(result1).toEqual(mockNganyas)
      expect(result2).toEqual(mockNganyas)
      expect(result3).toEqual(mockNganyas)
    })

    it('should deduplicate concurrent fetchCorridors requests', async () => {
      const getCorridorsSpy = vi.spyOn(discoverQueries, 'getCorridors').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockCorridors
      })

      const { fetchCorridors } = useNganyaStore.getState()

      // Make 3 concurrent requests
      const [result1, result2, result3] = await Promise.all([
        fetchCorridors(),
        fetchCorridors(),
        fetchCorridors(),
      ])

      // Should only call API once
      expect(getCorridorsSpy).toHaveBeenCalledOnce()
      expect(result1).toEqual(mockCorridors)
      expect(result2).toEqual(mockCorridors)
      expect(result3).toEqual(mockCorridors)
    })

    it('should deduplicate concurrent fetchLiveNganyas requests', async () => {
      const getLiveNowSpy = vi.spyOn(liveQueries, 'getLiveNow').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockLiveNganyas
      })

      const { fetchLiveNganyas } = useNganyaStore.getState()

      // Make 3 concurrent requests
      const [result1, result2, result3] = await Promise.all([
        fetchLiveNganyas(),
        fetchLiveNganyas(),
        fetchLiveNganyas(),
      ])

      // Should only call API once
      expect(getLiveNowSpy).toHaveBeenCalledOnce()
      expect(result1).toEqual(mockLiveNganyas)
      expect(result2).toEqual(mockLiveNganyas)
      expect(result3).toEqual(mockLiveNganyas)
    })

    it('should not deduplicate requests with different search terms', async () => {
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)

      const { fetchNganyas } = useNganyaStore.getState()

      await Promise.all([
        fetchNganyas('term1'),
        fetchNganyas('term2'),
      ])

      // Should call API twice with different terms
      expect(searchNganyasSpy).toHaveBeenCalledTimes(2)
      expect(searchNganyasSpy).toHaveBeenCalledWith('term1', undefined)
      expect(searchNganyasSpy).toHaveBeenCalledWith('term2', undefined)
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate nganyas cache', () => {
      useNganyaStore.setState({
        nganyas: mockNganyas,
        nganyasLastFetchedAt: Date.now(),
      })

      const { invalidateNganyas } = useNganyaStore.getState()
      invalidateNganyas()

      const state = useNganyaStore.getState()
      expect(state.nganyasLastFetchedAt).toBeNull()
      expect(state.nganyas).toBeNull()
    })

    it('should invalidate corridors cache', () => {
      useNganyaStore.setState({
        corridors: mockCorridors,
        corridorsLastFetchedAt: Date.now(),
      })

      const { invalidateCorridors } = useNganyaStore.getState()
      invalidateCorridors()

      const state = useNganyaStore.getState()
      expect(state.corridorsLastFetchedAt).toBeNull()
      expect(state.corridors).toBeNull()
    })

    it('should invalidate live nganyas cache', () => {
      useNganyaStore.setState({
        liveNganyas: mockLiveNganyas,
        liveNganyasLastFetchedAt: Date.now(),
      })

      const { invalidateLiveNganyas } = useNganyaStore.getState()
      invalidateLiveNganyas()

      const state = useNganyaStore.getState()
      expect(state.liveNganyasLastFetchedAt).toBeNull()
      expect(state.liveNganyas).toBeNull()
    })

    it('should invalidate all caches', () => {
      useNganyaStore.setState({
        nganyas: mockNganyas,
        nganyasLastFetchedAt: Date.now(),
        corridors: mockCorridors,
        corridorsLastFetchedAt: Date.now(),
        liveNganyas: mockLiveNganyas,
        liveNganyasLastFetchedAt: Date.now(),
      })

      const { invalidateAll } = useNganyaStore.getState()
      invalidateAll()

      const state = useNganyaStore.getState()
      expect(state.nganyasLastFetchedAt).toBeNull()
      expect(state.nganyas).toBeNull()
      expect(state.corridorsLastFetchedAt).toBeNull()
      expect(state.corridors).toBeNull()
      expect(state.liveNganyasLastFetchedAt).toBeNull()
      expect(state.liveNganyas).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle fetchNganyas errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(discoverQueries, 'searchNganyas').mockRejectedValue(error)

      const { fetchNganyas } = useNganyaStore.getState()

      await expect(fetchNganyas()).rejects.toThrow('Network error')

      const state = useNganyaStore.getState()
      expect(state.nganyasError).toEqual(error)
      expect(state.isLoadingNganyas).toBe(false)
    })

    it('should handle fetchCorridors errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(discoverQueries, 'getCorridors').mockRejectedValue(error)

      const { fetchCorridors } = useNganyaStore.getState()

      await expect(fetchCorridors()).rejects.toThrow('Network error')

      const state = useNganyaStore.getState()
      expect(state.corridorsError).toEqual(error)
      expect(state.isLoadingCorridors).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      vi.spyOn(discoverQueries, 'searchNganyas').mockRejectedValue(new Error('Network error'))

      // Set stale cached data
      useNganyaStore.setState({
        nganyas: mockNganyas,
        nganyasLastFetchedAt: Date.now() - 70_000, // stale
      })

      const { fetchNganyas } = useNganyaStore.getState()
      const result = await fetchNganyas()

      // Should return stale data
      expect(result).toEqual(mockNganyas)

      // Wait a bit for background fetch to fail
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stale data should still be in store
      const state = useNganyaStore.getState()
      expect(state.nganyas).toEqual(mockNganyas)
    })
  })
})
