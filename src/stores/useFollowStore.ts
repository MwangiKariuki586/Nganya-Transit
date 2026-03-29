import { create } from 'zustand'
import { getMyFollows, followNganya as followNganyaApi, unfollowNganya as unfollowNganyaApi } from '@/lib/queries/follows'

const FOLLOWS_TTL = 45_000 // 45 seconds

interface FollowStoreState {
  // Data
  followedNganyas: any[]
  followedIds: Set<string>

  // Metadata
  lastFetchedAt: number | null
  isLoading: boolean
  error: Error | null

  // Optimistic update tracking
  optimisticFollows: Set<string>
  optimisticUnfollows: Set<string>

  // Actions
  fetchFollowedNganyas: () => Promise<any[]>
  followNganya: (nganyaId: string) => Promise<void>
  unfollowNganya: (nganyaId: string) => Promise<void>
  isFollowing: (nganyaId: string) => boolean
  invalidate: () => void

  // Selectors
  isStale: () => boolean
}

export const useFollowStore = create<FollowStoreState>((set, get) => ({
  // Data
  followedNganyas: [],
  followedIds: new Set(),

  // Metadata
  lastFetchedAt: null,
  isLoading: false,
  error: null,

  // Optimistic update tracking
  optimisticFollows: new Set(),
  optimisticUnfollows: new Set(),

  // Selectors
  isStale: () => {
    const lastFetchedAt = get().lastFetchedAt
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > FOLLOWS_TTL
  },

  // Actions
  fetchFollowedNganyas: async () => {
    // Check cache first (stale-while-revalidate)
    const cached = get().followedNganyas
    const isStale = get().isStale()

    if (cached && !isStale) {
      return cached
    }

    // Return stale data immediately, fetch in background
    if (cached && isStale) {
      const promise = getMyFollows()

      promise
        .then((data) => {
          const followedIds = new Set(data.map((follow: any) => follow.nganya_id))
          set({
            followedNganyas: data,
            followedIds,
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
      const data = await getMyFollows()
      const followedIds = new Set(data.map((follow: any) => follow.nganya_id))
      set({
        followedNganyas: data,
        followedIds,
        lastFetchedAt: Date.now(),
        isLoading: false,
      })
      return data
    } catch (error) {
      set({
        error: error as Error,
        isLoading: false,
      })
      throw error
    }
  },

  followNganya: async (nganyaId: string) => {
    // Optimistic update
    const newOptimisticFollows = new Set(get().optimisticFollows)
    newOptimisticFollows.add(nganyaId)
    const newFollowedIds = new Set(get().followedIds)
    newFollowedIds.add(nganyaId)
    set({
      optimisticFollows: newOptimisticFollows,
      followedIds: newFollowedIds,
    })

    try {
      await followNganyaApi(nganyaId)

      // Remove from optimistic tracking
      const updatedOptimisticFollows = new Set(get().optimisticFollows)
      updatedOptimisticFollows.delete(nganyaId)
      set({ optimisticFollows: updatedOptimisticFollows })

      // Invalidate to trigger refresh
      get().invalidate()
    } catch (error) {
      // Rollback optimistic update
      const revertedOptimisticFollows = new Set(get().optimisticFollows)
      revertedOptimisticFollows.delete(nganyaId)

      const revertedFollowedIds = new Set(get().followedIds)
      revertedFollowedIds.delete(nganyaId)

      set({
        optimisticFollows: revertedOptimisticFollows,
        followedIds: revertedFollowedIds,
        error: error as Error,
      })
      throw error
    }
  },

  unfollowNganya: async (nganyaId: string) => {
    // Optimistic update
    const newOptimisticUnfollows = new Set(get().optimisticUnfollows)
    newOptimisticUnfollows.add(nganyaId)
    const newFollowedIds = new Set(get().followedIds)
    newFollowedIds.delete(nganyaId)
    set({
      optimisticUnfollows: newOptimisticUnfollows,
      followedIds: newFollowedIds,
    })

    try {
      await unfollowNganyaApi(nganyaId)

      // Remove from optimistic tracking
      const updatedOptimisticUnfollows = new Set(get().optimisticUnfollows)
      updatedOptimisticUnfollows.delete(nganyaId)
      set({ optimisticUnfollows: updatedOptimisticUnfollows })

      // Invalidate to trigger refresh
      get().invalidate()
    } catch (error) {
      // Rollback optimistic update
      const revertedOptimisticUnfollows = new Set(get().optimisticUnfollows)
      revertedOptimisticUnfollows.delete(nganyaId)

      const revertedFollowedIds = new Set(get().followedIds)
      revertedFollowedIds.add(nganyaId)

      set({
        optimisticUnfollows: revertedOptimisticUnfollows,
        followedIds: revertedFollowedIds,
        error: error as Error,
      })
      throw error
    }
  },

  isFollowing: (nganyaId: string) => {
    return get().followedIds.has(nganyaId)
  },

  invalidate: () => {
    set({ lastFetchedAt: null })
  },
}))
