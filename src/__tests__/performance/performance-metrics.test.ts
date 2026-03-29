/**
 * Performance Testing - State Management Migration
 *
 * This test suite measures and documents performance improvements from migrating
 * to Zustand stores with caching and request deduplication.
 *
 * **Validates: Requirements 2.6, 2.7, 2.8, 2.30, 2.31, 2.32**
 *
 * Metrics measured:
 * - Network request counts (before vs after)
 * - Duplicate request elimination
 * - Cache hit rates
 * - Loading times with caching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNganyaStore } from '@/stores/useNganyaStore'
import { useFollowStore } from '@/stores/useFollowStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCrewStore } from '@/stores/useCrewStore'
import { useAdminStore } from '@/stores/useAdminStore'
import * as discoverQueries from '@/lib/queries/discover'
import * as liveQueries from '@/lib/queries/live'
import * as followsQueries from '@/lib/queries/follows'
import * as authGuards from '@/shared/auth/guards'

// Mock data
const mockCorridors = [
  { id: 'corridor-1', name: 'Thika Road', slug: 'thika-road' },
  { id: 'corridor-2', name: 'Ngong Road', slug: 'ngong-road' },
]

const mockNganyas = [
  {
    id: 'nganya-1',
    name: 'Nganya 1',
    corridor_id: 'corridor-1',
    slug: 'nganya-1',
    registration_number: 'KAA 001A',
  },
  {
    id: 'nganya-2',
    name: 'Nganya 2',
    corridor_id: 'corridor-2',
    slug: 'nganya-2',
    registration_number: 'KBB 002B',
  },
]

const mockLiveNganyas = [
  {
    id: 'live-1',
    nganya_id: 'nganya-1',
    corridor_id: 'corridor-1',
    status: 'LIVE',
  },
]

const mockFollows = [
  { id: 'follow-1', nganya_id: 'nganya-1', user_id: 'user-1' },
]

interface PerformanceMetrics {
  networkRequestCount: number
  cacheHits: number
  cacheMisses: number
  averageLoadTime: number
  duplicateRequestsEliminated: number
}

describe('Performance Testing - State Management Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }

    // Reset all stores
    useNganyaStore.getState().invalidateAll()
    useFollowStore.getState().invalidate()
    useAuthStore.setState({ session: null, role: null, roleLastResolvedAt: null })
    useCrewStore.getState().invalidateBootstrap()
    useAdminStore.getState().invalidateAll()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Network Request Reduction', () => {
    it('should eliminate duplicate requests across multiple screen mounts', async () => {
      /**
       * **Validates: Requirement 2.6 - Request deduplication**
       *
       * Scenario: Multiple screens (HomeScreen, DiscoverScreen, SpotScreen) mount
       * simultaneously and need the same data (corridors, nganyas, liveNganyas)
       *
       * Before migration: Each screen makes independent requests
       * After migration: Requests are deduplicated through Zustand stores
       */

      let corridorRequestCount = 0
      let nganyaRequestCount = 0
      let liveNganyaRequestCount = 0

      vi.spyOn(discoverQueries, 'getCorridors').mockImplementation(async () => {
        corridorRequestCount++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return mockCorridors as any
      })

      vi.spyOn(discoverQueries, 'searchNganyas').mockImplementation(async () => {
        nganyaRequestCount++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return mockNganyas as any
      })

      vi.spyOn(liveQueries, 'getLiveNow').mockImplementation(async () => {
        liveNganyaRequestCount++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return mockLiveNganyas as any
      })

      const nganyaStore = useNganyaStore.getState()

      // Simulate 3 screens mounting simultaneously and requesting the same data
      const screen1Requests = Promise.all([
        nganyaStore.fetchCorridors(),
        nganyaStore.fetchNganyas(),
        nganyaStore.fetchLiveNganyas(),
      ])

      const screen2Requests = Promise.all([
        nganyaStore.fetchCorridors(),
        nganyaStore.fetchNganyas(),
        nganyaStore.fetchLiveNganyas(),
      ])

      const screen3Requests = Promise.all([
        nganyaStore.fetchCorridors(),
        nganyaStore.fetchNganyas(),
        nganyaStore.fetchLiveNganyas(),
      ])

      await Promise.all([screen1Requests, screen2Requests, screen3Requests])

      // Verify: Only 1 request per resource (not 3)
      expect(corridorRequestCount).toBe(1)
      expect(nganyaRequestCount).toBe(1)
      expect(liveNganyaRequestCount).toBe(1)

      // Calculate improvement
      const beforeMigration = 9 // 3 screens × 3 requests each
      const afterMigration = 3 // 1 request per resource
      const improvement = ((beforeMigration - afterMigration) / beforeMigration) * 100

      console.log('\n📊 Network Request Reduction:')
      console.log(`  Before: ${beforeMigration} requests`)
      console.log(`  After: ${afterMigration} requests`)
      console.log(`  Improvement: ${improvement.toFixed(1)}% reduction`)
      console.log(`  Duplicate requests eliminated: ${beforeMigration - afterMigration}`)
    })

    it('should measure network requests for sequential screen navigation', async () => {
      /**
       * **Validates: Requirement 2.7 - Caching across screens**
       *
       * Scenario: User navigates HomeScreen → DiscoverScreen → SpotScreen
       *
       * Before migration: Each screen re-fetches data on mount
       * After migration: Data is served from cache if fresh
       */

      let totalRequestCount = 0

      vi.spyOn(discoverQueries, 'getCorridors').mockImplementation(async () => {
        totalRequestCount++
        return mockCorridors as any
      })

      vi.spyOn(discoverQueries, 'searchNganyas').mockImplementation(async () => {
        totalRequestCount++
        return mockNganyas as any
      })

      vi.spyOn(liveQueries, 'getLiveNow').mockImplementation(async () => {
        totalRequestCount++
        return mockLiveNganyas as any
      })

      const nganyaStore = useNganyaStore.getState()

      // Screen 1: HomeScreen mounts
      await nganyaStore.fetchCorridors()
      await nganyaStore.fetchNganyas()
      await nganyaStore.fetchLiveNganyas()

      const requestsAfterScreen1 = totalRequestCount

      // Screen 2: DiscoverScreen mounts (should use cache)
      await nganyaStore.fetchCorridors()
      await nganyaStore.fetchNganyas()
      await nganyaStore.fetchLiveNganyas()

      const requestsAfterScreen2 = totalRequestCount

      // Screen 3: SpotScreen mounts (should use cache)
      await nganyaStore.fetchCorridors()
      await nganyaStore.fetchNganyas()

      const requestsAfterScreen3 = totalRequestCount

      // Verify: No additional requests after initial fetch
      expect(requestsAfterScreen1).toBe(3) // Initial fetch
      expect(requestsAfterScreen2).toBe(3) // No new requests (cache hit)
      expect(requestsAfterScreen3).toBe(3) // No new requests (cache hit)

      console.log('\n📊 Sequential Navigation Performance:')
      console.log(`  Screen 1 (HomeScreen): ${requestsAfterScreen1} requests`)
      console.log(`  Screen 2 (DiscoverScreen): ${requestsAfterScreen2 - requestsAfterScreen1} new requests (cache hit)`)
      console.log(`  Screen 3 (SpotScreen): ${requestsAfterScreen3 - requestsAfterScreen2} new requests (cache hit)`)
      console.log(`  Total requests: ${totalRequestCount}`)
      console.log(`  Before migration would have been: 8 requests (3+3+2)`)
      console.log(`  Improvement: ${((8 - totalRequestCount) / 8 * 100).toFixed(1)}% reduction`)
    })
  })

  describe('Cache Hit Rate Measurement', () => {
    it('should measure cache hit rates for nganya store', async () => {
      /**
       * **Validates: Requirement 2.30 - TTL-based caching**
       *
       * Measures cache hit rate over multiple fetch attempts
       */

      const metrics: PerformanceMetrics = {
        networkRequestCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
        duplicateRequestsEliminated: 0,
      }

      vi.spyOn(discoverQueries, 'getCorridors').mockImplementation(async () => {
        metrics.networkRequestCount++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return mockCorridors as any
      })

      const nganyaStore = useNganyaStore.getState()

      // Perform 10 fetch attempts
      const fetchAttempts = 10
      const loadTimes: number[] = []

      for (let i = 0; i < fetchAttempts; i++) {
        const startTime = performance.now()
        await nganyaStore.fetchCorridors()
        const endTime = performance.now()
        loadTimes.push(endTime - startTime)

        // Small delay between fetches
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      metrics.cacheMisses = metrics.networkRequestCount
      metrics.cacheHits = fetchAttempts - metrics.networkRequestCount
      metrics.averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length

      const cacheHitRate = (metrics.cacheHits / fetchAttempts) * 100

      // Verify: High cache hit rate (should be > 80%)
      expect(cacheHitRate).toBeGreaterThan(80)
      expect(metrics.networkRequestCount).toBeLessThan(3) // Should only fetch once or twice

      console.log('\n📊 Cache Hit Rate Analysis:')
      console.log(`  Total fetch attempts: ${fetchAttempts}`)
      console.log(`  Network requests: ${metrics.networkRequestCount}`)
      console.log(`  Cache hits: ${metrics.cacheHits}`)
      console.log(`  Cache misses: ${metrics.cacheMisses}`)
      console.log(`  Cache hit rate: ${cacheHitRate.toFixed(1)}%`)
      console.log(`  Average load time: ${metrics.averageLoadTime.toFixed(2)}ms`)
    })

    it('should measure cache hit rates for auth store (RBAC)', async () => {
      /**
       * **Validates: Requirement 2.16, 2.17 - RBAC request deduplication**
       *
       * Measures cache hit rate for role resolution
       */

      let roleResolutionCount = 0

      vi.spyOn(authGuards, 'resolveClientRole').mockImplementation(async () => {
        roleResolutionCount++
        await new Promise((resolve) => setTimeout(resolve, 100))
        return 'fan' as any
      })

      const authStore = useAuthStore.getState()

      // Simulate 10 role resolution attempts (e.g., multiple route changes)
      const attempts = 10
      const loadTimes: number[] = []

      for (let i = 0; i < attempts; i++) {
        const startTime = performance.now()
        await authStore.resolveRole()
        const endTime = performance.now()
        loadTimes.push(endTime - startTime)

        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const cacheHits = attempts - roleResolutionCount
      const cacheHitRate = (cacheHits / attempts) * 100
      const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length

      // Verify: High cache hit rate
      expect(cacheHitRate).toBeGreaterThan(80)
      expect(roleResolutionCount).toBeLessThan(3)

      console.log('\n📊 RBAC Cache Hit Rate Analysis:')
      console.log(`  Total role resolution attempts: ${attempts}`)
      console.log(`  Actual role resolutions: ${roleResolutionCount}`)
      console.log(`  Cache hits: ${cacheHits}`)
      console.log(`  Cache hit rate: ${cacheHitRate.toFixed(1)}%`)
      console.log(`  Average load time: ${averageLoadTime.toFixed(2)}ms`)
      console.log(`  Before migration: Would have called resolveClientRole() ${attempts} times`)
      console.log(`  Improvement: ${((attempts - roleResolutionCount) / attempts * 100).toFixed(1)}% reduction`)
    })
  })

  describe('Loading Time Improvements', () => {
    it('should measure loading time improvements with caching', async () => {
      /**
       * **Validates: Requirement 2.31 - Stale-while-revalidate**
       *
       * Compares loading times for cache hits vs cache misses
       */

      vi.spyOn(discoverQueries, 'getCorridors').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate network delay
        return mockCorridors as any
      })

      const nganyaStore = useNganyaStore.getState()

      // First fetch (cache miss)
      const cacheMissStart = performance.now()
      await nganyaStore.fetchCorridors()
      const cacheMissEnd = performance.now()
      const cacheMissTime = cacheMissEnd - cacheMissStart

      // Second fetch (cache hit)
      const cacheHitStart = performance.now()
      await nganyaStore.fetchCorridors()
      const cacheHitEnd = performance.now()
      const cacheHitTime = cacheHitEnd - cacheHitStart

      // Verify: Cache hit is significantly faster
      expect(cacheHitTime).toBeLessThan(cacheMissTime * 0.1) // At least 10x faster

      const improvement = ((cacheMissTime - cacheHitTime) / cacheMissTime) * 100

      console.log('\n📊 Loading Time Comparison:')
      console.log(`  Cache miss (first load): ${cacheMissTime.toFixed(2)}ms`)
      console.log(`  Cache hit (subsequent load): ${cacheHitTime.toFixed(2)}ms`)
      console.log(`  Improvement: ${improvement.toFixed(1)}% faster`)
      console.log(`  Speed multiplier: ${(cacheMissTime / cacheHitTime).toFixed(1)}x`)
    })

    it('should measure stale-while-revalidate performance', async () => {
      /**
       * **Validates: Requirement 2.31 - Stale-while-revalidate pattern**
       *
       * Measures loading time when returning stale data immediately
       */

      let fetchCount = 0

      vi.spyOn(discoverQueries, 'getCorridors').mockImplementation(async () => {
        fetchCount++
        await new Promise((resolve) => setTimeout(resolve, 100))
        return mockCorridors as any
      })

      const nganyaStore = useNganyaStore.getState()

      // Initial fetch
      await nganyaStore.fetchCorridors()
      expect(fetchCount).toBe(1)

      // Make data stale
      useNganyaStore.setState({
        corridorsLastFetchedAt: Date.now() - 130_000, // 130 seconds ago (TTL is 120s)
      })

      // Fetch with stale data (should return immediately)
      const staleStart = performance.now()
      const result = await nganyaStore.fetchCorridors()
      const staleEnd = performance.now()
      const staleLoadTime = staleEnd - staleStart

      // Verify: Stale data returned immediately (< 10ms)
      expect(staleLoadTime).toBeLessThan(10)
      expect(result).toEqual(mockCorridors)

      // Wait for background refresh
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Verify: Background fetch occurred
      expect(fetchCount).toBe(2)

      console.log('\n📊 Stale-While-Revalidate Performance:')
      console.log(`  Stale data return time: ${staleLoadTime.toFixed(2)}ms`)
      console.log(`  Background refresh: Completed`)
      console.log(`  User experience: Instant data display (no loading state)`)
      console.log(`  Before migration: Would show loading spinner for ~100ms`)
    })
  })

  describe('Optimistic Update Performance', () => {
    it('should measure optimistic update performance for follow actions', async () => {
      /**
       * **Validates: Requirement 2.9 - Optimistic updates**
       *
       * Measures UI update time for optimistic updates
       */

      vi.spyOn(followsQueries, 'followNganya').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200)) // Simulate slow network
      })

      const followStore = useFollowStore.getState()

      // Measure time to UI update (optimistic)
      const optimisticStart = performance.now()
      const followPromise = followStore.followNganya('nganya-1')
      const isFollowingImmediately = followStore.isFollowing('nganya-1')
      const optimisticEnd = performance.now()
      const optimisticUpdateTime = optimisticEnd - optimisticStart

      // Verify: UI updated immediately
      expect(isFollowingImmediately).toBe(true)
      expect(optimisticUpdateTime).toBeLessThan(5) // Should be < 5ms

      // Wait for API call to complete
      await followPromise

      console.log('\n📊 Optimistic Update Performance:')
      console.log(`  UI update time: ${optimisticUpdateTime.toFixed(2)}ms`)
      console.log(`  API call time: ~200ms (in background)`)
      console.log(`  User experience: Instant feedback`)
      console.log(`  Before migration: Would wait for API call to complete`)
      console.log(`  Improvement: ${(200 / optimisticUpdateTime).toFixed(0)}x faster perceived performance`)
    })
  })

  describe('Performance Summary', () => {
    it('should generate comprehensive performance report', async () => {
      /**
       * **Validates: All performance requirements**
       *
       * Generates a comprehensive performance report comparing before and after migration
       */

      // Simulate realistic usage scenario
      let totalNetworkRequests = 0

      vi.spyOn(discoverQueries, 'getCorridors').mockImplementation(async () => {
        totalNetworkRequests++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return mockCorridors as any
      })

      vi.spyOn(discoverQueries, 'searchNganyas').mockImplementation(async () => {
        totalNetworkRequests++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return mockNganyas as any
      })

      vi.spyOn(liveQueries, 'getLiveNow').mockImplementation(async () => {
        totalNetworkRequests++
        await new Promise((resolve) => setTimeout(resolve, 50))
        return mockLiveNganyas as any
      })

      const nganyaStore = useNganyaStore.getState()

      // Scenario: User navigates through 5 screens
      const screens = ['Home', 'Discover', 'Spot', 'Following', 'Profile']
      const loadTimes: number[] = []

      for (const screen of screens) {
        const startTime = performance.now()

        // Each screen needs corridors, nganyas, and liveNganyas
        await Promise.all([
          nganyaStore.fetchCorridors(),
          nganyaStore.fetchNganyas(),
          nganyaStore.fetchLiveNganyas(),
        ])

        const endTime = performance.now()
        loadTimes.push(endTime - startTime)

        // Small delay between screen navigations
        await new Promise((resolve) => setTimeout(resolve, 20))
      }

      const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length

      // Calculate metrics
      const beforeMigration = {
        networkRequests: screens.length * 3, // Each screen makes 3 requests
        averageLoadTime: 150, // Estimated based on network delay
        cacheHitRate: 0,
      }

      const afterMigration = {
        networkRequests: totalNetworkRequests,
        averageLoadTime,
        cacheHitRate: ((screens.length * 3 - totalNetworkRequests) / (screens.length * 3)) * 100,
      }

      console.log('\n' + '='.repeat(60))
      console.log('📊 PERFORMANCE REPORT - STATE MANAGEMENT MIGRATION')
      console.log('='.repeat(60))
      console.log('\n📈 Network Request Reduction:')
      console.log(`  Before: ${beforeMigration.networkRequests} requests`)
      console.log(`  After: ${afterMigration.networkRequests} requests`)
      console.log(`  Reduction: ${((beforeMigration.networkRequests - afterMigration.networkRequests) / beforeMigration.networkRequests * 100).toFixed(1)}%`)
      console.log(`  Duplicate requests eliminated: ${beforeMigration.networkRequests - afterMigration.networkRequests}`)

      console.log('\n⚡ Loading Time Improvements:')
      console.log(`  Before: ~${beforeMigration.averageLoadTime}ms average`)
      console.log(`  After: ${afterMigration.averageLoadTime.toFixed(2)}ms average`)
      console.log(`  Improvement: ${((beforeMigration.averageLoadTime - afterMigration.averageLoadTime) / beforeMigration.averageLoadTime * 100).toFixed(1)}% faster`)

      console.log('\n💾 Cache Performance:')
      console.log(`  Cache hit rate: ${afterMigration.cacheHitRate.toFixed(1)}%`)
      console.log(`  Cache misses: ${totalNetworkRequests}`)
      console.log(`  Cache hits: ${screens.length * 3 - totalNetworkRequests}`)

      console.log('\n✅ Key Improvements:')
      console.log('  ✓ Request deduplication eliminates duplicate fetches')
      console.log('  ✓ TTL-based caching reduces unnecessary network calls')
      console.log('  ✓ Stale-while-revalidate provides instant data access')
      console.log('  ✓ Optimistic updates improve perceived performance')
      console.log('  ✓ Centralized state management ensures data consistency')

      console.log('\n' + '='.repeat(60))

      // Verify improvements
      expect(afterMigration.networkRequests).toBeLessThan(beforeMigration.networkRequests)
      expect(afterMigration.averageLoadTime).toBeLessThan(beforeMigration.averageLoadTime)
      expect(afterMigration.cacheHitRate).toBeGreaterThan(70)
    })
  })
})
