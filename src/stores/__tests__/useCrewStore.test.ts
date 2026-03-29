/**
 * Unit tests for useCrewStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Stale-while-revalidate pattern works correctly
 * - Request deduplication works correctly
 * - Schema validation works correctly
 * - Persistence works correctly
 * - Cache invalidation works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCrewStore } from '../useCrewStore'
import * as crewBootstrap from '@/shared/server-fns/crew-bootstrap'
import * as validators from '../validators'

// Mock data
const mockBootstrapSnapshot = {
  userId: 'user-1',
  role: 'crew',
  nganyaId: 'nganya-1',
  corridorId: 'corridor-1',
  sessionId: 'session-1',
  nganyaName: 'Test Nganya',
  corridorName: 'Test Corridor',
}

describe('useCrewStore', () => {
  beforeEach(() => {
    // Reset store state
    useCrewStore.setState({
      bootstrap: null,
      lastFetchedAt: null,
      isRefreshing: false,
      error: null,
      pendingBootstrapRequest: null,
    })

    // Clear localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return true for isStale when lastFetchedAt is null', () => {
      const { isStale } = useCrewStore.getState()
      expect(isStale()).toBe(true)
    })

    it('should return false for isStale when data is fresh (within 45s TTL)', () => {
      useCrewStore.setState({
        lastFetchedAt: Date.now() - 20_000, // 20 seconds ago
      })

      const { isStale } = useCrewStore.getState()
      expect(isStale()).toBe(false)
    })

    it('should return true for isStale when data is stale (beyond 45s TTL)', () => {
      useCrewStore.setState({
        lastFetchedAt: Date.now() - 50_000, // 50 seconds ago
      })

      const { isStale } = useCrewStore.getState()
      expect(isStale()).toBe(true)
    })
  })

  describe('Schema validation', () => {
    it('should return cached bootstrap when valid and fresh', async () => {
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot').mockReturnValue(true)
      const getCrewBootstrapServerFnSpy = vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockResolvedValue(mockBootstrapSnapshot)

      // Set fresh cached data
      useCrewStore.setState({
        bootstrap: mockBootstrapSnapshot,
        lastFetchedAt: Date.now() - 20_000, // 20 seconds ago (fresh)
      })

      const { fetchBootstrap } = useCrewStore.getState()
      const result = await fetchBootstrap()

      expect(result).toEqual(mockBootstrapSnapshot)
      expect(getCrewBootstrapServerFnSpy).not.toHaveBeenCalled()
      expect(validators.validateCrewBootstrapSnapshot).toHaveBeenCalledWith(mockBootstrapSnapshot)
    })

    it('should fetch fresh data when cached data is invalid', async () => {
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot')
        .mockReturnValueOnce(false) // Invalid cached data
        .mockReturnValueOnce(true)  // Valid fresh data
      const getCrewBootstrapServerFnSpy = vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockResolvedValue(mockBootstrapSnapshot)

      // Set cached data that will fail validation
      useCrewStore.setState({
        bootstrap: { userId: undefined } as any,
        lastFetchedAt: Date.now() - 20_000,
      })

      const { fetchBootstrap } = useCrewStore.getState()
      const result = await fetchBootstrap()

      expect(result).toEqual(mockBootstrapSnapshot)
      expect(getCrewBootstrapServerFnSpy).toHaveBeenCalledOnce()
    })

    it('should throw error when fetched data fails validation', async () => {
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot').mockReturnValue(false)
      vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockResolvedValue({ invalid: 'data' } as any)

      const { fetchBootstrap } = useCrewStore.getState()

      await expect(fetchBootstrap()).rejects.toThrow('Invalid bootstrap data schema')

      const state = useCrewStore.getState()
      expect(state.error).toBeDefined()
      expect(state.isRefreshing).toBe(false)
    })
  })

  describe('Stale-while-revalidate pattern', () => {
    it('should return stale bootstrap immediately and fetch in background when stale', async () => {
      const newMockBootstrap = { ...mockBootstrapSnapshot, sessionId: 'session-2' }
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot').mockReturnValue(true)
      const getCrewBootstrapServerFnSpy = vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockResolvedValue(newMockBootstrap)

      // Set stale cached data
      useCrewStore.setState({
        bootstrap: mockBootstrapSnapshot,
        lastFetchedAt: Date.now() - 50_000, // 50 seconds ago (stale)
      })

      const { fetchBootstrap } = useCrewStore.getState()
      const result = await fetchBootstrap()

      // Should return stale data immediately
      expect(result).toEqual(mockBootstrapSnapshot)
      expect(getCrewBootstrapServerFnSpy).toHaveBeenCalledOnce()

      // Wait for background fetch to complete
      await vi.waitFor(() => {
        const state = useCrewStore.getState()
        expect(state.bootstrap).toEqual(newMockBootstrap)
      })
    })

    it('should fetch fresh bootstrap when no cache exists', async () => {
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot').mockReturnValue(true)
      const getCrewBootstrapServerFnSpy = vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockResolvedValue(mockBootstrapSnapshot)

      const { fetchBootstrap } = useCrewStore.getState()
      const result = await fetchBootstrap()

      expect(result).toEqual(mockBootstrapSnapshot)
      expect(getCrewBootstrapServerFnSpy).toHaveBeenCalledOnce()
      expect(useCrewStore.getState().bootstrap).toEqual(mockBootstrapSnapshot)
      expect(useCrewStore.getState().lastFetchedAt).toBeGreaterThan(0)
    })
  })

  describe('Request deduplication', () => {
    it('should deduplicate concurrent fetchBootstrap requests', async () => {
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot').mockReturnValue(true)
      const getCrewBootstrapServerFnSpy = vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockBootstrapSnapshot
      })

      const { fetchBootstrap } = useCrewStore.getState()

      // Make 3 concurrent requests
      const [result1, result2, result3] = await Promise.all([
        fetchBootstrap(),
        fetchBootstrap(),
        fetchBootstrap(),
      ])

      // Should only call API once
      expect(getCrewBootstrapServerFnSpy).toHaveBeenCalledOnce()
      expect(result1).toEqual(mockBootstrapSnapshot)
      expect(result2).toEqual(mockBootstrapSnapshot)
      expect(result3).toEqual(mockBootstrapSnapshot)
    })
  })

  describe('setBootstrap', () => {
    it('should set bootstrap and update lastFetchedAt', () => {
      const { setBootstrap } = useCrewStore.getState()
      setBootstrap(mockBootstrapSnapshot)

      const state = useCrewStore.getState()
      expect(state.bootstrap).toEqual(mockBootstrapSnapshot)
      expect(state.lastFetchedAt).toBeGreaterThan(0)
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate bootstrap cache', () => {
      useCrewStore.setState({
        bootstrap: mockBootstrapSnapshot,
        lastFetchedAt: Date.now(),
      })

      const { invalidateBootstrap } = useCrewStore.getState()
      invalidateBootstrap()

      const state = useCrewStore.getState()
      expect(state.lastFetchedAt).toBeNull()
      expect(state.bootstrap).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle fetchBootstrap errors', async () => {
      const error = new Error('Network error')
      vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockRejectedValue(error)

      const { fetchBootstrap } = useCrewStore.getState()

      await expect(fetchBootstrap()).rejects.toThrow('Network error')

      const state = useCrewStore.getState()
      expect(state.error).toEqual(error)
      expect(state.isRefreshing).toBe(false)
    })

    it('should keep stale data on background fetch error', async () => {
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot').mockReturnValue(true)
      vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockRejectedValue(new Error('Network error'))

      // Set stale cached data
      useCrewStore.setState({
        bootstrap: mockBootstrapSnapshot,
        lastFetchedAt: Date.now() - 50_000, // stale
      })

      const { fetchBootstrap } = useCrewStore.getState()
      const result = await fetchBootstrap()

      // Should return stale data
      expect(result).toEqual(mockBootstrapSnapshot)

      // Wait a bit for background fetch to fail
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stale data should still be in store
      const state = useCrewStore.getState()
      expect(state.bootstrap).toEqual(mockBootstrapSnapshot)
    })

    it('should clear pending request on error', async () => {
      const error = new Error('Network error')
      vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockRejectedValue(error)

      const { fetchBootstrap } = useCrewStore.getState()

      try {
        await fetchBootstrap()
      } catch (e) {
        // Expected error
      }

      const state = useCrewStore.getState()
      expect(state.pendingBootstrapRequest).toBeNull()
    })
  })

  describe('Loading states', () => {
    it('should set isRefreshing during bootstrap fetch', async () => {
      vi.spyOn(validators, 'validateCrewBootstrapSnapshot').mockReturnValue(true)
      vi.spyOn(crewBootstrap, 'getCrewBootstrapServerFn').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockBootstrapSnapshot
      })

      const { fetchBootstrap } = useCrewStore.getState()
      const promise = fetchBootstrap()

      // Check loading state is set
      await vi.waitFor(() => {
        const state = useCrewStore.getState()
        expect(state.isRefreshing).toBe(true)
      })

      await promise

      // Check loading state is cleared
      const state = useCrewStore.getState()
      expect(state.isRefreshing).toBe(false)
    })
  })
})
