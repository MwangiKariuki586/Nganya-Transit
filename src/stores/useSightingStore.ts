import { create } from 'zustand'
import { getMySightings, getCorridorSightings, postSighting as postSightingApi } from '@/lib/queries/sightings'

const USER_SIGHTINGS_TTL = 60_000 // 60 seconds
const RECENT_SIGHTINGS_TTL = 30_000 // 30 seconds

interface SightingStoreState {
  // Data
  userSightings: any[]
  recentSightings: any[]

  // Metadata
  userSightingsLastFetchedAt: number | null
  recentSightingsLastFetchedAt: number | null

  isLoadingUserSightings: boolean
  isLoadingRecentSightings: boolean

  error: Error | null

  // Actions
  fetchUserSightings: () => Promise<any[]>
  fetchRecentSightings: (corridorId: string) => Promise<any[]>
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
  recentSightings: [],

  // Metadata
  userSightingsLastFetchedAt: null,
  recentSightingsLastFetchedAt: null,

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
    const lastFetchedAt = get().recentSightingsLastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > RECENT_SIGHTINGS_TTL
  },

  // Actions
  fetchUserSightings: async () => {
    // Check cache first (stale-while-revalidate)
    const cached = get().userSightings
    const isStale = get().isUserSightingsStale()

    if (cached && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale) {
      const promise = getMySightings()

      promise
        .then((data) => {
          set({
            userSightings: data,
            userSightingsLastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache, fetch fresh
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
    // Check cache first (stale-while-revalidate)
    const cached = get().recentSightings
    const isStale = get().isRecentSightingsStale()

    if (cached && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale) {
      const promise = getCorridorSightings(corridorId)

      promise
        .then((data) => {
          set({
            recentSightings: data,
            recentSightingsLastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoadingRecentSightings: true, error: null })

    try {
      const data = await getCorridorSightings(corridorId)
      set({
        recentSightings: data,
        recentSightingsLastFetchedAt: Date.now(),
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

      // Invalidate both user and recent sightings to trigger refresh
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
    set({ recentSightingsLastFetchedAt: null })
  },
}))
