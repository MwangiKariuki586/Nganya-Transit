import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCrewBootstrapServerFn } from '@/shared/server-fns/crew-bootstrap'
import { validateCrewBootstrapSnapshot } from './validators'
import type { CrewBootstrapSnapshot } from '@/shared/types/crew-bootstrap'

const BOOTSTRAP_TTL = 45_000 // 45 seconds

interface CrewStoreState {
  // Data
  bootstrap: CrewBootstrapSnapshot | null

  // Metadata
  lastFetchedAt: number | null
  isRefreshing: boolean
  error: Error | null

  // In-flight request tracking
  pendingBootstrapRequest: Promise<CrewBootstrapSnapshot> | null

  // Actions
  fetchBootstrap: () => Promise<CrewBootstrapSnapshot>
  invalidateBootstrap: () => void
  setBootstrap: (snapshot: CrewBootstrapSnapshot) => void

  // Selectors
  isStale: () => boolean
}

export const useCrewStore = create<CrewStoreState>()(
  persist(
    (set, get) => ({
      // Data
      bootstrap: null,

      // Metadata
      lastFetchedAt: null,
      isRefreshing: false,
      error: null,

      // In-flight request tracking
      pendingBootstrapRequest: null,

      // Selectors
      isStale: () => {
        const lastFetchedAt = get().lastFetchedAt
        if (!lastFetchedAt) return true
        return Date.now() - lastFetchedAt > BOOTSTRAP_TTL
      },

      // Actions
      fetchBootstrap: async () => {
        // Check if request is already in-flight
        const pending = get().pendingBootstrapRequest
        if (pending) return pending

        // Check cache first with schema validation
        const cached = get().bootstrap
        const isStale = get().isStale()

        if (cached && !isStale && validateCrewBootstrapSnapshot(cached)) {
          return cached
        }

        // Return stale data immediately if valid, fetch in background
        if (cached && isStale && validateCrewBootstrapSnapshot(cached)) {
          const promise = getCrewBootstrapServerFn()
          set({ pendingBootstrapRequest: promise })

          promise
            .then((data) => {
              if (validateCrewBootstrapSnapshot(data)) {
                set({
                  bootstrap: data,
                  lastFetchedAt: Date.now(),
                  pendingBootstrapRequest: null,
                })
              }
            })
            .catch(() => {
              set({ pendingBootstrapRequest: null })
            })

          return cached
        }

        // No valid cache, fetch fresh
        set({ isRefreshing: true, error: null })
        const promise = getCrewBootstrapServerFn()
        set({ pendingBootstrapRequest: promise })

        try {
          const data = await promise

          if (!validateCrewBootstrapSnapshot(data)) {
            throw new Error('Invalid bootstrap data schema')
          }

          set({
            bootstrap: data,
            lastFetchedAt: Date.now(),
            isRefreshing: false,
            pendingBootstrapRequest: null,
          })
          return data
        } catch (error) {
          set({
            error: error as Error,
            isRefreshing: false,
            pendingBootstrapRequest: null,
          })
          throw error
        }
      },

      invalidateBootstrap: () => {
        set({ lastFetchedAt: null, bootstrap: null })
      },

      setBootstrap: (snapshot: CrewBootstrapSnapshot) => {
        set({ bootstrap: snapshot, lastFetchedAt: Date.now() })
      },
    }),
    {
      name: 'matwana:crew-bootstrap',
      version: 1,
      partialize: (state) => ({
        bootstrap: state.bootstrap,
        lastFetchedAt: state.lastFetchedAt,
      }),
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration logic from v0 to v1 if needed
          return {
            ...persistedState,
          }
        }
        return persistedState as CrewStoreState
      },
    }
  )
)
