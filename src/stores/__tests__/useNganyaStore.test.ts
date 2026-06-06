/**
 * Unit tests for useNganyaStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Stale-while-revalidate pattern works correctly
 * - Request deduplication works correctly
 * - Cache invalidation works correctly
 * - Parameter-keyed caching returns correct data per key
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

function resetStore() {
  useNganyaStore.setState({
    nganyasCache: new Map(),
    corridorsCache: null,
    liveNganyasCache: new Map(),
    currentNganyaKey: 'nganyas::',
    currentLiveKey: 'liveNganyas:',
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
}

describe('useNganyaStore', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return true for isNganyasStale when no cache entry exists', () => {
      const { isNganyasStale } = useNganyaStore.getState()
      expect(isNganyasStale()).toBe(true)
    })

    it('should return false for isNganyasStale when data is fresh (within 60s TTL)', async () => {
      vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)
      await useNganyaStore.getState().fetchNganyas()

      const { isNganyasStale } = useNganyaStore.getState()
      expect(isNganyasStale()).toBe(false)
    })

    it('should return false for isCorridorsStale when data is fresh (within 120s TTL)', async () => {
      vi.spyOn(discoverQueries, 'getCorridors').mockResolvedValue(mockCorridors)
      await useNganyaStore.getState().fetchCorridors()

      const { isCorridorsStale } = useNganyaStore.getState()
      expect(isCorridorsStale()).toBe(false)
    })

    it('should return false for isLiveNganyasStale when data is fresh (within 30s TTL)', async () => {
      vi.spyOn(liveQueries, 'getLiveNow').mockResolvedValue(mockLiveNganyas)
      await useNganyaStore.getState().fetchLiveNganyas()

      const { isLiveNganyasStale } = useNganyaStore.getState()
      expect(isLiveNganyasStale()).toBe(false)
    })
  })

  describe('Stale-while-revalidate pattern', () => {
    it('should return cached nganyas immediately when fresh', async () => {
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)

      // First fetch to populate cache
      await useNganyaStore.getState().fetchNganyas()
      searchNganyasSpy.mockClear()

      // Second fetch should use cache
      const result = await useNganyaStore.getState().fetchNganyas()

      expect(result).toEqual(mockNganyas)
      expect(searchNganyasSpy).not.toHaveBeenCalled()
    })

    it('should return stale nganyas immediately and fetch in background when stale', async () => {
      const newMockNganyas = [...mockNganyas, { id: 'nganya-3', name: 'Nganya 3', corridor_id: 'corridor-1' }]
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)

      // First fetch to populate cache
      await useNganyaStore.getState().fetchNganyas()

      // Make cache stale by manipulating the cache entry
      const key = 'nganyas::'
      const staleCache = new Map(useNganyaStore.getState().nganyasCache)
      staleCache.set(key, { data: mockNganyas, fetchedAt: Date.now() - 70_000 })
      useNganyaStore.setState({ nganyasCache: staleCache })

      searchNganyasSpy.mockClear()
      searchNganyasSpy.mockResolvedValue(newMockNganyas)
      const result = await useNganyaStore.getState().fetchNganyas()

      // Should return stale data immediately
      expect(result).toEqual(mockNganyas)
      expect(searchNganyasSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useNganyaStore.getState()
        expect(state.getNganyas()).toEqual(newMockNganyas)
      })
    })

    it('should fetch fresh corridors when no cache exists', async () => {
      const getCorridorsSpy = vi.spyOn(discoverQueries, 'getCorridors').mockResolvedValue(mockCorridors)

      const result = await useNganyaStore.getState().fetchCorridors()

      expect(result).toEqual(mockCorridors)
      expect(getCorridorsSpy).toHaveBeenCalledOnce()
      expect(useNganyaStore.getState().getCorridors()).toEqual(mockCorridors)
    })
  })

  describe('Request deduplication', () => {
    it('should deduplicate concurrent fetchNganyas requests', async () => {
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockNganyas
      })

      const { fetchNganyas } = useNganyaStore.getState()

      const [result1, result2, result3] = await Promise.all([
        fetchNganyas('test'),
        fetchNganyas('test'),
        fetchNganyas('test'),
      ])

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

      const [result1, result2, result3] = await Promise.all([
        fetchCorridors(),
        fetchCorridors(),
        fetchCorridors(),
      ])

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

      const [result1, result2, result3] = await Promise.all([
        fetchLiveNganyas(),
        fetchLiveNganyas(),
        fetchLiveNganyas(),
      ])

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

      expect(searchNganyasSpy).toHaveBeenCalledTimes(2)
      expect(searchNganyasSpy).toHaveBeenCalledWith('term1', undefined)
      expect(searchNganyasSpy).toHaveBeenCalledWith('term2', undefined)
    })
  })

  describe('Parameter-keyed caching', () => {
    it('should cache nganyas separately per search term', async () => {
      const term1Results = [{ id: '1', name: 'Rongai Bus' }]
      const term2Results = [{ id: '2', name: 'Kiambu Express' }]

      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas')
        .mockResolvedValueOnce(term1Results)
        .mockResolvedValueOnce(term2Results)

      await useNganyaStore.getState().fetchNganyas('rongai')
      expect(useNganyaStore.getState().getNganyas()).toEqual(term1Results)

      await useNganyaStore.getState().fetchNganyas('kiambu')
      expect(useNganyaStore.getState().getNganyas()).toEqual(term2Results)

      // Switching back to 'rongai' should use cache
      searchNganyasSpy.mockClear()
      const result = await useNganyaStore.getState().fetchNganyas('rongai')
      expect(result).toEqual(term1Results)
      expect(useNganyaStore.getState().getNganyas()).toEqual(term1Results)
      expect(searchNganyasSpy).not.toHaveBeenCalled()
    })

    it('should cache live nganyas separately per corridor', async () => {
      const corridor1Live = [{ id: 'l1', corridor_id: 'c1' }]
      const corridor2Live = [{ id: 'l2', corridor_id: 'c2' }]

      const getLiveNowSpy = vi.spyOn(liveQueries, 'getLiveNow')
        .mockResolvedValueOnce(corridor1Live)
        .mockResolvedValueOnce(corridor2Live)

      await useNganyaStore.getState().fetchLiveNganyas('c1')
      expect(useNganyaStore.getState().getLiveNganyas()).toEqual(corridor1Live)

      await useNganyaStore.getState().fetchLiveNganyas('c2')
      expect(useNganyaStore.getState().getLiveNganyas()).toEqual(corridor2Live)

      // Switching back should use cache
      getLiveNowSpy.mockClear()
      const result = await useNganyaStore.getState().fetchLiveNganyas('c1')
      expect(result).toEqual(corridor1Live)
      expect(useNganyaStore.getState().getLiveNganyas()).toEqual(corridor1Live)
      expect(getLiveNowSpy).not.toHaveBeenCalled()
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate all nganyas cache entries', async () => {
      vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)

      await useNganyaStore.getState().fetchNganyas('a')
      await useNganyaStore.getState().fetchNganyas('b')

      useNganyaStore.getState().invalidateNganyas()

      expect(useNganyaStore.getState().nganyasCache.size).toBe(0)
      expect(useNganyaStore.getState().getNganyas()).toBeNull()
    })

    it('should invalidate corridors cache', async () => {
      vi.spyOn(discoverQueries, 'getCorridors').mockResolvedValue(mockCorridors)

      await useNganyaStore.getState().fetchCorridors()
      useNganyaStore.getState().invalidateCorridors()

      expect(useNganyaStore.getState().corridorsCache).toBeNull()
      expect(useNganyaStore.getState().getCorridors()).toBeNull()
    })

    it('should invalidate all caches', async () => {
      vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)
      vi.spyOn(discoverQueries, 'getCorridors').mockResolvedValue(mockCorridors)
      vi.spyOn(liveQueries, 'getLiveNow').mockResolvedValue(mockLiveNganyas)

      await useNganyaStore.getState().fetchNganyas()
      await useNganyaStore.getState().fetchCorridors()
      await useNganyaStore.getState().fetchLiveNganyas()

      useNganyaStore.getState().invalidateAll()

      expect(useNganyaStore.getState().getNganyas()).toBeNull()
      expect(useNganyaStore.getState().getCorridors()).toBeNull()
      expect(useNganyaStore.getState().getLiveNganyas()).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle fetchNganyas errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(discoverQueries, 'searchNganyas').mockRejectedValue(error)

      await expect(useNganyaStore.getState().fetchNganyas()).rejects.toThrow('Network error')

      const state = useNganyaStore.getState()
      expect(state.nganyasError).toEqual(error)
      expect(state.isLoadingNganyas).toBe(false)
    })

    it('should handle fetchCorridors errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(discoverQueries, 'getCorridors').mockRejectedValue(error)

      await expect(useNganyaStore.getState().fetchCorridors()).rejects.toThrow('Network error')

      const state = useNganyaStore.getState()
      expect(state.corridorsError).toEqual(error)
      expect(state.isLoadingCorridors).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      const searchNganyasSpy = vi.spyOn(discoverQueries, 'searchNganyas').mockResolvedValue(mockNganyas)

      // Populate cache
      await useNganyaStore.getState().fetchNganyas()

      // Make stale
      const key = 'nganyas::'
      const staleCache = new Map(useNganyaStore.getState().nganyasCache)
      staleCache.set(key, { data: mockNganyas, fetchedAt: Date.now() - 70_000 })
      useNganyaStore.setState({ nganyasCache: staleCache })

      searchNganyasSpy.mockRejectedValue(new Error('Network error'))

      const result = await useNganyaStore.getState().fetchNganyas()
      expect(result).toEqual(mockNganyas)

      await new Promise(resolve => setTimeout(resolve, 100))

      // Stale data should still be accessible
      expect(useNganyaStore.getState().getNganyas()).toEqual(mockNganyas)
    })
  })
})
