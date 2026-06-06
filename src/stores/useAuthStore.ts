import { create } from 'zustand'
import { resolveClientRole } from '@/shared/auth/guards'
import type { AppRole } from '@/shared/types/rbac'
import type { Session } from '@supabase/supabase-js'

const ROLE_TTL = 120_000 // 120 seconds

interface AuthStoreState {
  // Data
  session: Session | null
  role: AppRole | null

  // Metadata
  roleLastResolvedAt: number | null
  isResolvingRole: boolean
  roleError: Error | null

  // In-flight request tracking
  pendingRoleResolution: Promise<AppRole | null> | null

  // Actions
  resolveRole: () => Promise<AppRole | null>
  invalidateRole: () => void
  setSession: (session: Session | null) => void

  // Selectors
  isRoleStale: () => boolean
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  // Data
  session: null,
  role: null,

  // Metadata
  roleLastResolvedAt: null,
  isResolvingRole: false,
  roleError: null,

  // In-flight request tracking
  pendingRoleResolution: null,

  // Selectors
  isRoleStale: () => {
    const lastResolvedAt = get().roleLastResolvedAt
    if (!lastResolvedAt) return true
    return Date.now() - lastResolvedAt > ROLE_TTL
  },

  isAuthenticated: () => {
    return get().session !== null
  },

  // Actions
  resolveRole: async () => {
    // Check if resolution is already in-flight
    const pending = get().pendingRoleResolution
    if (pending) return pending

    // Check cache first
    const cached = get().role
    const isStale = get().isRoleStale()

    if (cached !== null && !isStale) {
      return cached
    }

    // Resolve role
    set({ isResolvingRole: true, roleError: null })
    const promise = resolveClientRole()
    set({ pendingRoleResolution: promise })

    try {
      const role = await promise
      set({
        role,
        roleLastResolvedAt: Date.now(),
        isResolvingRole: false,
        pendingRoleResolution: null,
      })
      return role
    } catch (error) {
      set({
        roleError: error as Error,
        isResolvingRole: false,
        pendingRoleResolution: null,
      })
      throw error
    }
  },

  invalidateRole: () => {
    set({ roleLastResolvedAt: null, role: null })
  },

  setSession: (session: Session | null) => {
    set({ session })
    // Invalidate role when session changes
    if (!session) {
      get().invalidateRole()
    }
  },
}))
