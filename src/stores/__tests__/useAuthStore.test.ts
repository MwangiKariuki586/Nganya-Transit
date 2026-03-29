/**
 * Unit tests for useAuthStore
 * 
 * Tests verify:
 * - TTL-based freshness checks work correctly
 * - Request deduplication works correctly
 * - Role caching works correctly
 * - Cache invalidation works correctly
 * - Session management works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from '../useAuthStore'
import * as authGuards from '@/shared/auth/guards'

// Mock data
const mockSession = {
  access_token: 'mock-token',
  user: { id: 'user-1', email: 'test@example.com' },
} as any

const mockRole = 'fan' as any

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      session: null,
      role: null,
      roleLastResolvedAt: null,
      isResolvingRole: false,
      roleError: null,
      pendingRoleResolution: null,
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('TTL-based freshness checks', () => {
    it('should return true for isRoleStale when roleLastResolvedAt is null', () => {
      const { isRoleStale } = useAuthStore.getState()
      expect(isRoleStale()).toBe(true)
    })

    it('should return false for isRoleStale when role is fresh (within 120s TTL)', () => {
      useAuthStore.setState({
        roleLastResolvedAt: Date.now() - 60_000, // 60 seconds ago
      })

      const { isRoleStale } = useAuthStore.getState()
      expect(isRoleStale()).toBe(false)
    })

    it('should return true for isRoleStale when role is stale (beyond 120s TTL)', () => {
      useAuthStore.setState({
        roleLastResolvedAt: Date.now() - 130_000, // 130 seconds ago
      })

      const { isRoleStale } = useAuthStore.getState()
      expect(isRoleStale()).toBe(true)
    })
  })

  describe('Request deduplication', () => {
    it('should deduplicate concurrent resolveRole requests', async () => {
      const resolveClientRoleSpy = vi.spyOn(authGuards, 'resolveClientRole').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockRole
      })

      const { resolveRole } = useAuthStore.getState()

      // Make 3 concurrent requests
      const [result1, result2, result3] = await Promise.all([
        resolveRole(),
        resolveRole(),
        resolveRole(),
      ])

      // Should only call API once
      expect(resolveClientRoleSpy).toHaveBeenCalledOnce()
      expect(result1).toEqual(mockRole)
      expect(result2).toEqual(mockRole)
      expect(result3).toEqual(mockRole)
    })

    it('should return cached role when fresh', async () => {
      const resolveClientRoleSpy = vi.spyOn(authGuards, 'resolveClientRole').mockResolvedValue(mockRole)

      // Set fresh cached role
      useAuthStore.setState({
        role: mockRole,
        roleLastResolvedAt: Date.now() - 60_000, // 60 seconds ago (fresh)
      })

      const { resolveRole } = useAuthStore.getState()
      const result = await resolveRole()

      expect(result).toEqual(mockRole)
      expect(resolveClientRoleSpy).not.toHaveBeenCalled()
    })

    it('should resolve role when stale', async () => {
      const newMockRole = 'crew' as any
      const resolveClientRoleSpy = vi.spyOn(authGuards, 'resolveClientRole').mockResolvedValue(newMockRole)

      // Set stale cached role
      useAuthStore.setState({
        role: mockRole,
        roleLastResolvedAt: Date.now() - 130_000, // 130 seconds ago (stale)
      })

      const { resolveRole } = useAuthStore.getState()
      const result = await resolveRole()

      expect(result).toEqual(newMockRole)
      expect(resolveClientRoleSpy).toHaveBeenCalledOnce()
      expect(useAuthStore.getState().role).toEqual(newMockRole)
    })

    it('should resolve role when no cache exists', async () => {
      const resolveClientRoleSpy = vi.spyOn(authGuards, 'resolveClientRole').mockResolvedValue(mockRole)

      const { resolveRole } = useAuthStore.getState()
      const result = await resolveRole()

      expect(result).toEqual(mockRole)
      expect(resolveClientRoleSpy).toHaveBeenCalledOnce()
      expect(useAuthStore.getState().role).toEqual(mockRole)
      expect(useAuthStore.getState().roleLastResolvedAt).toBeGreaterThan(0)
    })
  })

  describe('Session management', () => {
    it('should set session', () => {
      const { setSession } = useAuthStore.getState()
      setSession(mockSession)

      const state = useAuthStore.getState()
      expect(state.session).toEqual(mockSession)
    })

    it('should invalidate role when session is cleared', () => {
      useAuthStore.setState({
        session: mockSession,
        role: mockRole,
        roleLastResolvedAt: Date.now(),
      })

      const { setSession } = useAuthStore.getState()
      setSession(null)

      const state = useAuthStore.getState()
      expect(state.session).toBeNull()
      expect(state.role).toBeNull()
      expect(state.roleLastResolvedAt).toBeNull()
    })

    it('should not invalidate role when session is set', () => {
      useAuthStore.setState({
        role: mockRole,
        roleLastResolvedAt: Date.now(),
      })

      const { setSession } = useAuthStore.getState()
      setSession(mockSession)

      const state = useAuthStore.getState()
      expect(state.session).toEqual(mockSession)
      expect(state.role).toEqual(mockRole)
      expect(state.roleLastResolvedAt).not.toBeNull()
    })
  })

  describe('isAuthenticated selector', () => {
    it('should return true when session exists', () => {
      useAuthStore.setState({
        session: mockSession,
      })

      const { isAuthenticated } = useAuthStore.getState()
      expect(isAuthenticated()).toBe(true)
    })

    it('should return false when session is null', () => {
      useAuthStore.setState({
        session: null,
      })

      const { isAuthenticated } = useAuthStore.getState()
      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('Cache invalidation', () => {
    it('should invalidate role cache', () => {
      useAuthStore.setState({
        role: mockRole,
        roleLastResolvedAt: Date.now(),
      })

      const { invalidateRole } = useAuthStore.getState()
      invalidateRole()

      const state = useAuthStore.getState()
      expect(state.roleLastResolvedAt).toBeNull()
      expect(state.role).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle resolveRole errors', async () => {
      const error = new Error('Auth error')
      vi.spyOn(authGuards, 'resolveClientRole').mockRejectedValue(error)

      const { resolveRole } = useAuthStore.getState()

      await expect(resolveRole()).rejects.toThrow('Auth error')

      const state = useAuthStore.getState()
      expect(state.roleError).toEqual(error)
      expect(state.isResolvingRole).toBe(false)
    })

    it('should clear pending request on error', async () => {
      const error = new Error('Auth error')
      vi.spyOn(authGuards, 'resolveClientRole').mockRejectedValue(error)

      const { resolveRole } = useAuthStore.getState()

      try {
        await resolveRole()
      } catch (e) {
        // Expected error
      }

      const state = useAuthStore.getState()
      expect(state.pendingRoleResolution).toBeNull()
    })
  })

  describe('Loading states', () => {
    it('should set isResolvingRole during role resolution', async () => {
      vi.spyOn(authGuards, 'resolveClientRole').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockRole
      })

      const { resolveRole } = useAuthStore.getState()
      const promise = resolveRole()

      // Check loading state is set
      await vi.waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.isResolvingRole).toBe(true)
      })

      await promise

      // Check loading state is cleared
      const state = useAuthStore.getState()
      expect(state.isResolvingRole).toBe(false)
    })
  })
})
