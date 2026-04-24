import { create } from 'zustand'
import { getMySightings, getCorridorSightings, postSighting as postSightingApi } from '@/lib/queries/sightings'
import { retryWithBackoff } from '@/lib/utils/retry'

const USER_SIGHTINGS_TTL = 60_000 // 60 seconds
const RECENT_SIGHTINGS_TTL = 30_000 // 30 seconds

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

interface SightingStoreState {
  // Data
  userSightings: any[]
  recentSightingsCache: Map<string, CacheEntry<any[]>>
  currentCorridorKey: string

  // Metadata
  userSightingsLastFetchedAt: number | null

  isLoadingUserSightings: boolean
  isLoadingRecentSightings: boolean

  error: Error | null

  // Actions
  fetchUserSightings: () => Promise<any[]>
  fetchRecentSightings: (corridorId: string) => Promise<any[]>
  getRecentSightings: () => any[]
  postSighting: (sighting: {
    nganya_id: string
    corridor_id: string
    location: any
    direction?: string
    note?: string
    media_urls?: string[]
  }) => Promise<void>
  invalidateUserSightings: () => void
  invalidateRecentSightings: () => void

  // Selectors
  isUserSightingsStale: () => boolean
  isRecentSightingsStale: () => boolean
}

export const useSightingStore = create<SightingStoreState>((set, get) => ({
  // Data
  userSightings: [],
  recentSightingsCache: new Map(),
  currentCorridorKey: '',

  // Metadata
  userSightingsLastFetchedAt: null,

  isLoadingUserSightings: false,
  isLoadingRecentSightings: false,

  error: null,

  // Selectors
  isUserSightingsStale: () => {
    const lastFetchedAt = get().userSightingsLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > USER_SIGHTINGS_TTL
  },

  isRecentSightingsStale: () => {
    const key = get().currentCorridorKey
    const entry = get().recentSightingsCache.get(key)
    if (!entry) return true
    return Date.now() - entry.fetchedAt > RECENT_SIGHTINGS_TTL
  },

  getRecentSightings: () => {
    const key = get().currentCorridorKey
    return get().recentSightingsCache.get(key)?.data ?? []
  },

  // Actions
  fetchUserSightings: async () => {
    const cached = get().userSightings
    const isStale = get().isUserSightingsStale()

    if (cached && !isStale) {
      return cached
    }

    if (cached && isStale) {
      retryWithBackoff(() => getMySightings(), { maxAttempts: 2, initialDelay: 1000 })
        .then((data) => {
          set({
            userSightings: data,
            userSightingsLastFetchedAt: Date.now(),
            error: null,
          })
        })
        .catch((error) => {
          set({ error: error as Error })
        })

      return cached
    }

    set({ isLoadingUserSightings: true, error: null })

    try {
      const data = await getMySightings()
      set({
        userSightings: data,
        userSightingsLastFetchedAt: Date.now(),
        isLoadingUserSightings: false,
      })
      return data
    } catch (error) {
      set({
        error: error as Error,
        isLoadingUserSightings: false,
      })
      throw error
    }
  },

  fetchRecentSightings: async (corridorId: string) => {
    set({ currentCorridorKey: corridorId })

    const cached = get().recentSightingsCache.get(corridorId)
    const isStale = !cached || (Date.now() - cached.fetchedAt > RECENT_SIGHTINGS_TTL)

    if (cached && !isStale) {
      return cached.data
    }

    if (cached && isStale) {
      retryWithBackoff(() => getCorridorSightings(corridorId), { maxAttempts: 2, initialDelay: 1000 })
        .then((data) => {
          const updatedCache = new Map(get().recentSightingsCache)
          updatedCache.set(corridorId, { data, fetchedAt: Date.now() })
          set({ recentSightingsCache: updatedCache, error: null })
        })
        .catch((error) => {
          set({ error: error as Error })
        })

      return cached.data
    }

    set({ isLoadingRecentSightings: true, error: null })

    try {
      const data = await getCorridorSightings(corridorId)
      const updatedCache = new Map(get().recentSightingsCache)
      updatedCache.set(corridorId, { data, fetchedAt: Date.now() })
      set({
        recentSightingsCache: updatedCache,
        isLoadingRecentSightings: false,
      })
      return data
    } catch (error) {
      set({
        error: error as Error,
        isLoadingRecentSightings: false,
      })
      throw error
    }
  },

  postSighting: async (sighting) => {
    try {
      await postSightingApi(sighting)

      get().invalidateUserSightings()
      get().invalidateRecentSightings()
    } catch (error) {
      set({ error: error as Error })
      throw error
    }
  },

  invalidateUserSightings: () => {
    set({ userSightingsLastFetchedAt: null })
  },

  invalidateRecentSightings: () => {
    set({ recentSightingsCache: new Map() })
  },
}))
