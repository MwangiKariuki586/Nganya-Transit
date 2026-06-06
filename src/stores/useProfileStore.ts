import { create } from 'zustand'
import { getCurrentAuthUser, getCurrentUserProfile, updateCurrentUserProfile as updateProfileApi } from '@/lib/queries/profile'

const PROFILE_TTL = 60_000 // 60 seconds

interface ProfileStoreState {
  // Data
  authUser: any | null
  profile: any | null

  // Metadata
  lastFetchedAt: number | null
  isLoading: boolean
  error: Error | null

  // Actions
  fetchProfile: () => Promise<any>
  updateProfile: (updates: { full_name: string; handle: string }) => Promise<void>
  invalidate: () => void

  // Selectors
  isStale: () => boolean
}

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
  // Data
  authUser: null,
  profile: null,

  // Metadata
  lastFetchedAt: null,
  isLoading: false,
  error: null,

  // Selectors
  isStale: () => {
    const lastFetchedAt = get().lastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > PROFILE_TTL
  },

  // Actions
  fetchProfile: async () => {
    // Check cache first (stale-while-revalidate)
    const cached = get().profile
    const isStale = get().isStale()

    if (cached && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale) {
      const promise = Promise.all([getCurrentAuthUser(), getCurrentUserProfile()])

      promise
        .then(([authUser, profile]) => {
          set({
            authUser,
            profile,
            lastFetchedAt: Date.now(),
          })
        })
        .catch(() => {
          // Keep stale data on error
        })

      return cached
    }

    // No cache, fetch fresh
    set({ isLoading: true, error: null })

    try {
      const [authUser, profile] = await Promise.all([
        getCurrentAuthUser(),
        getCurrentUserProfile(),
      ])
      set({
        authUser,
        profile,
        lastFetchedAt: Date.now(),
        isLoading: false,
      })
      return profile
    } catch (error) {
      set({
        error: error as Error,
        isLoading: false,
      })
      throw error
    }
  },

  updateProfile: async (updates: { full_name: string; handle: string }) => {
    const currentProfile = get().profile

    // Optimistic update
    set({ profile: { ...currentProfile, ...updates } })

    try {
      await updateProfileApi(updates)

      // Invalidate to trigger refresh
      get().invalidate()
    } catch (error) {
      // Rollback optimistic update
      set({ profile: currentProfile, error: error as Error })
      throw error
    }
  },

  invalidate: () => {
    set({ lastFetchedAt: null })
  },
}))
