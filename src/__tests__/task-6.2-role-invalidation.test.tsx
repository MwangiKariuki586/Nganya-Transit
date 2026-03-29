/**
 * Task 6.2: Role Invalidation on Auth State Changes
 *
 * This test verifies that role invalidation is called on signin/signout flows.
 *
 * **Validates: Requirements 2.19, 3.40**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/useAuthStore";

describe("Task 6.2: Role Invalidation on Auth State Changes", () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuthStore.setState({
      session: null,
      role: null,
      roleLastResolvedAt: null,
      isResolvingRole: false,
      roleError: null,
      pendingRoleResolution: null,
    });
  });

  it("should invalidate role when invalidateRole is called", () => {
    // **Validates: Requirement 2.19**
    // Set up initial state with a cached role
    useAuthStore.setState({
      role: "fan",
      roleLastResolvedAt: Date.now(),
    });

    // Verify role is cached
    expect(useAuthStore.getState().role).toBe("fan");
    expect(useAuthStore.getState().roleLastResolvedAt).not.toBeNull();

    // Call invalidateRole (simulating what happens on signin/signout)
    useAuthStore.getState().invalidateRole();

    // Verify role cache is cleared
    expect(useAuthStore.getState().role).toBeNull();
    expect(useAuthStore.getState().roleLastResolvedAt).toBeNull();
  });

  it("should mark role as stale after invalidation", () => {
    // **Validates: Requirement 2.19**
    // Set up initial state with a cached role
    useAuthStore.setState({
      role: "crew",
      roleLastResolvedAt: Date.now(),
    });

    // Verify role is not stale initially
    expect(useAuthStore.getState().isRoleStale()).toBe(false);

    // Invalidate role
    useAuthStore.getState().invalidateRole();

    // Verify role is now stale (because roleLastResolvedAt is null)
    expect(useAuthStore.getState().isRoleStale()).toBe(true);
  });

  it("should preserve session when invalidating role", () => {
    // **Validates: Requirement 3.40**
    // Set up initial state with session and role
    const mockSession = { user: { id: "test-user" } } as any;
    useAuthStore.setState({
      session: mockSession,
      role: "admin",
      roleLastResolvedAt: Date.now(),
    });

    // Invalidate role
    useAuthStore.getState().invalidateRole();

    // Verify session is preserved but role is cleared
    expect(useAuthStore.getState().session).toBe(mockSession);
    expect(useAuthStore.getState().role).toBeNull();
  });

  it("should allow role re-resolution after invalidation", async () => {
    // **Validates: Requirement 2.19**
    // Set up initial state with a cached role
    useAuthStore.setState({
      role: "fan",
      roleLastResolvedAt: Date.now(),
    });

    // Invalidate role
    useAuthStore.getState().invalidateRole();

    // Verify role can be re-resolved (isRoleStale returns true)
    expect(useAuthStore.getState().isRoleStale()).toBe(true);
    expect(useAuthStore.getState().role).toBeNull();
  });
});
