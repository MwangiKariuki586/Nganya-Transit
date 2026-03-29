import { create } from 'zustand'
import { searchNganyas, getCorridors } from '@/lib/queries/discover'
import { getLiveNow } from '@/lib/queries/live'

const NGANYAS_TTL = 60_000 // 60 seconds
const CORRIDORS_TTL = 120_000 // 120 seconds
const LIVE_NGANYAS_TTL = 30_000 // 30 seconds

interface NganyaStoreState {
  // Data
  nganyas: any[] | null
  corridors: any[] | null
  liveNganyas: any[] | null

  // Metadata
  nganyasLastFetchedAt: number | null
  corridorsLastFetchedAt: number | null
  liveNganyasLastFetchedAt: number | null

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

  // Actions
  fetchNganyas: (searchTerm?: string, corridorId?: string) => Promise<any[]>
  fetchCorridors: () => Promise<any[]>
  fetchLiveNganyas: (corridorId?: string) => Promise<any[]>

  invalidateNganyas: () => void
  invalidateCorridors: () => void
  invalidateLiveNganyas: () => void
  invalidateAll: () => void

  // Selectors
  isNganyasStale: () => boolean
  isCorridorsStale: () => boolean
  isLiveNganyasStale: () => boolean
}

export const useNganyaStore = create<NganyaStoreState>((set, get) => ({
  // Data
  nganyas: null,
  corridors: null,
  liveNganyas: null,

  // Metadata
  nganyasLastFetchedAt: null,
  corridorsLastFetchedAt: null,
  liveNganyasLastFetchedAt: null,

  isLoadingNganyas: false,
  isLoadingCorridors: false,
  isLoadingLiveNganyas: false,

  nganyasError: null,
  corridorsError: null,
  liveNganyasError: null,

  // In-flight request tracking
  pendingNganyaRequests: new Map(),
  pendingCorridorRequests: new Map(),
  pendingLiveNganyaRequests: new Map(),

  // Selectors
  isNganyasStale: () => {
    const lastFetchedAt = get().nganyasLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > NGANYAS_TTL
  },

  isCorridorsStale: () => {
    const lastFetchedAt = get().corridorsLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > CORRIDORS_TTL
  },

  isLiveNganyasStale: () => {
    const lastFetchedAt = get().liveNganyasLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > LIVE_NGANYAS_TTL
  },

  // Actions
  fetchNganyas: async (searchTerm = '', corridorId?: string) => {
    const requestKey = `nganyas:${searchTerm}:${corridorId || ''}`

    // Check if request is already in-flight
    const pending = get().pendingNganyaRequests.get(requestKey)
    if (pending) return pending

    // Check cache first (stale-while-revalidate)
    const cached = get().nganyas
    const isStale = get().isNganyasStale()
    const hasCachedData = cached !== null && cached.length > 0

    if (hasCachedData && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (hasCachedData && isStale) {
      const promise = searchNganyas(searchTerm, corridorId)
      const newPendingRequests = new Map(get().pendingNganyaRequests)
      newPendingRequests.set(requestKey, promise)
      set({ pendingNganyaRequests: newPendingRequests })

      promise
        .then((data) => {
          const updatedPendingRequests = new Map(get().pendingNganyaRequests)
          updatedPendingRequests.delete(requestKey)
          set({
            nganyas: data,
            nganyasLastFetchedAt: Date.now(),
            pendingNganyaRequests: updatedPendingRequests,
          })
        })
        .catch(() => {
          const updatedPendingRequests = new Map(get().pendingNganyaRequests)
          updatedPendingRequests.delete(requestKey)
          set({ pendingNganyaRequests: updatedPendingRequests })
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingNganyas: true, nganyasError: null })
    const promise = searchNganyas(searchTerm, corridorId)
    const newPendingRequests = new Map(get().pendingNganyaRequests)
    newPendingRequests.set(requestKey, promise)
    set({ pendingNganyaRequests: newPendingRequests })

    try {
      const data = await promise
      const updatedPendingRequests = new Map(get().pendingNganyaRequests)
      updatedPendingRequests.delete(requestKey)
      set({
        nganyas: data,
        nganyasLastFetchedAt: Date.now(),
        isLoadingNganyas: false,
        pendingNganyaRequests: updatedPendingRequests,
      })
      return data
    } catch (error) {
      const updatedPendingRequests = new Map(get().pendingNganyaRequests)
      updatedPendingRequests.delete(requestKey)
      set({
        nganyasError: error as Error,
        isLoadingNganyas: false,
        pendingNganyaRequests: updatedPendingRequests,
      })
      throw error
    }
  },

  fetchCorridors: async () => {
    const requestKey = 'corridors'

    // Check if request is already in-flight
    const pending = get().pendingCorridorRequests.get(requestKey)
    if (pending) return pending

    // Check cache first (stale-while-revalidate)
    const cached = get().corridors
    const isStale = get().isCorridorsStale()
    const hasCachedData = cached !== null && cached.length > 0

    if (hasCachedData && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (hasCachedData && isStale) {
      const promise = getCorridors()
      const newPendingRequests = new Map(get().pendingCorridorRequests)
      newPendingRequests.set(requestKey, promise)
      set({ pendingCorridorRequests: newPendingRequests })

      promise
        .then((data) => {
          const updatedPendingRequests = new Map(get().pendingCorridorRequests)
          updatedPendingRequests.delete(requestKey)
          set({
            corridors: data,
            corridorsLastFetchedAt: Date.now(),
            pendingCorridorRequests: updatedPendingRequests,
          })
        })
        .catch(() => {
          const updatedPendingRequests = new Map(get().pendingCorridorRequests)
          updatedPendingRequests.delete(requestKey)
          set({ pendingCorridorRequests: updatedPendingRequests })
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingCorridors: true, corridorsError: null })
    const promise = getCorridors()
    const newPendingRequests = new Map(get().pendingCorridorRequests)
    newPendingRequests.set(requestKey, promise)
    set({ pendingCorridorRequests: newPendingRequests })

    try {
      const data = await promise
      const updatedPendingRequests = new Map(get().pendingCorridorRequests)
      updatedPendingRequests.delete(requestKey)
      set({
        corridors: data,
        corridorsLastFetchedAt: Date.now(),
        isLoadingCorridors: false,
        pendingCorridorRequests: updatedPendingRequests,
      })
      return data
    } catch (error) {
      const updatedPendingRequests = new Map(get().pendingCorridorRequests)
      updatedPendingRequests.delete(requestKey)
      set({
        corridorsError: error as Error,
        isLoadingCorridors: false,
        pendingCorridorRequests: updatedPendingRequests,
      })
      throw error
    }
  },

  fetchLiveNganyas: async (corridorId?: string) => {
    const requestKey = `liveNganyas:${corridorId || ''}`

    // Check if request is already in-flight
    const pending = get().pendingLiveNganyaRequests.get(requestKey)
    if (pending) return pending

    // Check cache first (stale-while-revalidate)
    const cached = get().liveNganyas
    const isStale = get().isLiveNganyasStale()
    const hasCachedData = cached !== null && cached.length > 0

    if (hasCachedData && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (hasCachedData && isStale) {
      const promise = getLiveNow(corridorId)
      const newPendingRequests = new Map(get().pendingLiveNganyaRequests)
      newPendingRequests.set(requestKey, promise)
      set({ pendingLiveNganyaRequests: newPendingRequests })

      promise
        .then((data) => {
          const updatedPendingRequests = new Map(get().pendingLiveNganyaRequests)
          updatedPendingRequests.delete(requestKey)
          set({
            liveNganyas: data,
            liveNganyasLastFetchedAt: Date.now(),
            pendingLiveNganyaRequests: updatedPendingRequests,
          })
        })
        .catch(() => {
          const updatedPendingRequests = new Map(get().pendingLiveNganyaRequests)
          updatedPendingRequests.delete(requestKey)
          set({ pendingLiveNganyaRequests: updatedPendingRequests })
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingLiveNganyas: true, liveNganyasError: null })
    const promise = getLiveNow(corridorId)
    const newPendingRequests = new Map(get().pendingLiveNganyaRequests)
    newPendingRequests.set(requestKey, promise)
    set({ pendingLiveNganyaRequests: newPendingRequests })

    try {
      const data = await promise
      const updatedPendingRequests = new Map(get().pendingLiveNganyaRequests)
      updatedPendingRequests.delete(requestKey)
      set({
        liveNganyas: data,
        liveNganyasLastFetchedAt: Date.now(),
        isLoadingLiveNganyas: false,
        pendingLiveNganyaRequests: updatedPendingRequests,
      })
      return data
    } catch (error) {
      const updatedPendingRequests = new Map(get().pendingLiveNganyaRequests)
      updatedPendingRequests.delete(requestKey)
      set({
        liveNganyasError: error as Error,
        isLoadingLiveNganyas: false,
        pendingLiveNganyaRequests: updatedPendingRequests,
      })
      throw error
    }
  },

  invalidateNganyas: () => {
    set({ nganyasLastFetchedAt: null, nganyas: null })
  },

  invalidateCorridors: () => {
    set({ corridorsLastFetchedAt: null, corridors: null })
  },

  invalidateLiveNganyas: () => {
    set({ liveNganyasLastFetchedAt: null, liveNganyas: null })
  },

  invalidateAll: () => {
    set({
      nganyasLastFetchedAt: null,
      nganyas: null,
      corridorsLastFetchedAt: null,
      corridors: null,
      liveNganyasLastFetchedAt: null,
      liveNganyas: null,
    })
  },
}))
