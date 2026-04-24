import { create } from 'zustand'
import { searchNganyas, getCorridors } from '@/lib/queries/discover'
import { getLiveNow } from '@/lib/queries/live'
import { retryWithBackoff } from '@/lib/utils/retry'

const NGANYAS_TTL = 60_000 // 60 seconds
const CORRIDORS_TTL = 120_000 // 120 seconds
const LIVE_NGANYAS_TTL = 30_000 // 30 seconds

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

interface NganyaStoreState {
  // Keyed caches: Map<requestKey, CacheEntry>
  nganyasCache: Map<string, CacheEntry<any[]>>
  corridorsCache: CacheEntry<any[]> | null
  liveNganyasCache: Map<string, CacheEntry<any[]>>

  // Current request key tracking (so consumers know which data to read)
  currentNganyaKey: string
  currentLiveKey: string

  isLoadingNganyas: boolean
  isLoadingCorridors: boolean
  isLoadingLiveNganyas: boolean

  nganyasError: Error | null
  corridorsError: Error | null
  liveNganyasError: Error | null

  // In-flight request tracking
  pendingNganyaRequests: Map<string, Promise<any[]>>
  pendingCorridorRequests: Map<string, Promise<any[]>>
  pendingLiveNganyaRequests: Map<string, Promise<any[]>>

  // Selectors
  getNganyas: () => any[] | null
  getCorridors: () => any[] | null
  getLiveNganyas: () => any[] | null

  // Actions
  fetchNganyas: (searchTerm?: string, corridorId?: string) => Promise<any[]>
  fetchCorridors: () => Promise<any[]>
  fetchLiveNganyas: (corridorId?: string) => Promise<any[]>

  invalidateNganyas: () => void
  invalidateCorridors: () => void
  invalidateLiveNganyas: () => void
  invalidateAll: () => void

  isNganyasStale: () => boolean
  isCorridorsStale: () => boolean
  isLiveNganyasStale: () => boolean
}

function buildNganyaKey(searchTerm = '', corridorId?: string) {
  return `nganyas:${searchTerm}:${corridorId || ''}`
}

function buildLiveKey(corridorId?: string) {
  return `liveNganyas:${corridorId || ''}`
}

function isCacheStale<T>(entry: CacheEntry<T> | undefined | null, ttl: number): boolean {
  if (!entry) return true
  return Date.now() - entry.fetchedAt > ttl
}

export const useNganyaStore = create<NganyaStoreState>((set, get) => ({
  nganyasCache: new Map(),
  corridorsCache: null,
  liveNganyasCache: new Map(),

  currentNganyaKey: buildNganyaKey(),
  currentLiveKey: buildLiveKey(),

  isLoadingNganyas: false,
  isLoadingCorridors: false,
  isLoadingLiveNganyas: false,

  nganyasError: null,
  corridorsError: null,
  liveNganyasError: null,

  pendingNganyaRequests: new Map(),
  pendingCorridorRequests: new Map(),
  pendingLiveNganyaRequests: new Map(),

  getNganyas: () => {
    const key = get().currentNganyaKey
    return get().nganyasCache.get(key)?.data ?? null
  },

  getCorridors: () => {
    return get().corridorsCache?.data ?? null
  },

  getLiveNganyas: () => {
    const key = get().currentLiveKey
    return get().liveNganyasCache.get(key)?.data ?? null
  },

  isNganyasStale: () => {
    const key = get().currentNganyaKey
    return isCacheStale(get().nganyasCache.get(key), NGANYAS_TTL)
  },

  isCorridorsStale: () => {
    return isCacheStale(get().corridorsCache, CORRIDORS_TTL)
  },

  isLiveNganyasStale: () => {
    const key = get().currentLiveKey
    return isCacheStale(get().liveNganyasCache.get(key), LIVE_NGANYAS_TTL)
  },

  fetchNganyas: async (searchTerm = '', corridorId?: string) => {
    const requestKey = buildNganyaKey(searchTerm, corridorId)

    set({ currentNganyaKey: requestKey })

    const pending = get().pendingNganyaRequests.get(requestKey)
    if (pending) return pending

    const cached = get().nganyasCache.get(requestKey)
    const isStale = isCacheStale(cached, NGANYAS_TTL)

    if (cached && !isStale) {
      return cached.data
    }

    if (cached && isStale) {
      const promise = retryWithBackoff(() => searchNganyas(searchTerm, corridorId), { maxAttempts: 2, initialDelay: 1000 })
      const newPendingRequests = new Map(get().pendingNganyaRequests)
      newPendingRequests.set(requestKey, promise)
      set({ pendingNganyaRequests: newPendingRequests })

      promise
        .then((data) => {
          const updatedPending = new Map(get().pendingNganyaRequests)
          updatedPending.delete(requestKey)
          const updatedCache = new Map(get().nganyasCache)
          updatedCache.set(requestKey, { data, fetchedAt: Date.now() })
          set({ nganyasCache: updatedCache, nganyasError: null, pendingNganyaRequests: updatedPending })
        })
        .catch((error) => {
          const updatedPending = new Map(get().pendingNganyaRequests)
          updatedPending.delete(requestKey)
          set({ nganyasError: error as Error, pendingNganyaRequests: updatedPending })
        })

      return cached.data
    }

    set({ isLoadingNganyas: true, nganyasError: null })
    const promise = searchNganyas(searchTerm, corridorId)
    const newPendingRequests = new Map(get().pendingNganyaRequests)
    newPendingRequests.set(requestKey, promise)
    set({ pendingNganyaRequests: newPendingRequests })

    try {
      const data = await promise
      const updatedPending = new Map(get().pendingNganyaRequests)
      updatedPending.delete(requestKey)
      const updatedCache = new Map(get().nganyasCache)
      updatedCache.set(requestKey, { data, fetchedAt: Date.now() })
      set({
        nganyasCache: updatedCache,
        isLoadingNganyas: false,
        pendingNganyaRequests: updatedPending,
      })
      return data
    } catch (error) {
      const updatedPending = new Map(get().pendingNganyaRequests)
      updatedPending.delete(requestKey)
      set({
        nganyasError: error as Error,
        isLoadingNganyas: false,
        pendingNganyaRequests: updatedPending,
      })
      throw error
    }
  },

  fetchCorridors: async () => {
    const requestKey = 'corridors'

    const pending = get().pendingCorridorRequests.get(requestKey)
    if (pending) return pending

    const cached = get().corridorsCache
    const isStale = isCacheStale(cached, CORRIDORS_TTL)

    if (cached && !isStale) {
      return cached.data
    }

    if (cached && isStale) {
      const promise = retryWithBackoff(() => getCorridors(), { maxAttempts: 2, initialDelay: 1000 })
      const newPendingRequests = new Map(get().pendingCorridorRequests)
      newPendingRequests.set(requestKey, promise)
      set({ pendingCorridorRequests: newPendingRequests })

      promise
        .then((data) => {
          const updatedPending = new Map(get().pendingCorridorRequests)
          updatedPending.delete(requestKey)
          set({
            corridorsCache: { data, fetchedAt: Date.now() },
            corridorsError: null,
            pendingCorridorRequests: updatedPending,
          })
        })
        .catch((error) => {
          const updatedPending = new Map(get().pendingCorridorRequests)
          updatedPending.delete(requestKey)
          set({ corridorsError: error as Error, pendingCorridorRequests: updatedPending })
        })

      return cached.data
    }

    set({ isLoadingCorridors: true, corridorsError: null })
    const promise = getCorridors()
    const newPendingRequests = new Map(get().pendingCorridorRequests)
    newPendingRequests.set(requestKey, promise)
    set({ pendingCorridorRequests: newPendingRequests })

    try {
      const data = await promise
      const updatedPending = new Map(get().pendingCorridorRequests)
      updatedPending.delete(requestKey)
      set({
        corridorsCache: { data, fetchedAt: Date.now() },
        isLoadingCorridors: false,
        pendingCorridorRequests: updatedPending,
      })
      return data
    } catch (error) {
      const updatedPending = new Map(get().pendingCorridorRequests)
      updatedPending.delete(requestKey)
      set({
        corridorsError: error as Error,
        isLoadingCorridors: false,
        pendingCorridorRequests: updatedPending,
      })
      throw error
    }
  },

  fetchLiveNganyas: async (corridorId?: string) => {
    const requestKey = buildLiveKey(corridorId)

    set({ currentLiveKey: requestKey })

    const pending = get().pendingLiveNganyaRequests.get(requestKey)
    if (pending) return pending

    const cached = get().liveNganyasCache.get(requestKey)
    const isStale = isCacheStale(cached, LIVE_NGANYAS_TTL)

    if (cached && !isStale) {
      return cached.data
    }

    if (cached && isStale) {
      const promise = retryWithBackoff(() => getLiveNow(corridorId), { maxAttempts: 2, initialDelay: 1000 })
      const newPendingRequests = new Map(get().pendingLiveNganyaRequests)
      newPendingRequests.set(requestKey, promise)
      set({ pendingLiveNganyaRequests: newPendingRequests })

      promise
        .then((data) => {
          const updatedPending = new Map(get().pendingLiveNganyaRequests)
          updatedPending.delete(requestKey)
          const updatedCache = new Map(get().liveNganyasCache)
          updatedCache.set(requestKey, { data, fetchedAt: Date.now() })
          set({ liveNganyasCache: updatedCache, liveNganyasError: null, pendingLiveNganyaRequests: updatedPending })
        })
        .catch((error) => {
          const updatedPending = new Map(get().pendingLiveNganyaRequests)
          updatedPending.delete(requestKey)
          set({ liveNganyasError: error as Error, pendingLiveNganyaRequests: updatedPending })
        })

      return cached.data
    }

    set({ isLoadingLiveNganyas: true, liveNganyasError: null })
    const promise = getLiveNow(corridorId)
    const newPendingRequests = new Map(get().pendingLiveNganyaRequests)
    newPendingRequests.set(requestKey, promise)
    set({ pendingLiveNganyaRequests: newPendingRequests })

    try {
      const data = await promise
      const updatedPending = new Map(get().pendingLiveNganyaRequests)
      updatedPending.delete(requestKey)
      const updatedCache = new Map(get().liveNganyasCache)
      updatedCache.set(requestKey, { data, fetchedAt: Date.now() })
      set({
        liveNganyasCache: updatedCache,
        isLoadingLiveNganyas: false,
        pendingLiveNganyaRequests: updatedPending,
      })
      return data
    } catch (error) {
      const updatedPending = new Map(get().pendingLiveNganyaRequests)
      updatedPending.delete(requestKey)
      set({
        liveNganyasError: error as Error,
        isLoadingLiveNganyas: false,
        pendingLiveNganyaRequests: updatedPending,
      })
      throw error
    }
  },

  invalidateNganyas: () => {
    set({ nganyasCache: new Map() })
  },

  invalidateCorridors: () => {
    set({ corridorsCache: null })
  },

  invalidateLiveNganyas: () => {
    set({ liveNganyasCache: new Map() })
  },

  invalidateAll: () => {
    set({
      nganyasCache: new Map(),
      corridorsCache: null,
      liveNganyasCache: new Map(),
    })
  },
}))
