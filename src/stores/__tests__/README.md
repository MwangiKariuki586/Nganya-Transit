# Zustand Store Unit Tests

This directory contains comprehensive unit tests for all 7 Zustand stores in the MATWANA application.

## Test Coverage Summary

### Total Tests: 125 passing

## Store Test Files

### 1. useNganyaStore.test.ts (22 tests)

Tests for the Nganya store that manages nganyas, corridors, and live nganyas data.

**Coverage:**

- ✅ TTL-based freshness checks (7 tests)
  - Nganyas: 60s TTL
  - Corridors: 120s TTL
  - Live Nganyas: 30s TTL
- ✅ Stale-while-revalidate pattern (4 tests)
  - Returns cached data when fresh
  - Returns stale data immediately and fetches in background
  - Fetches fresh data when no cache exists
- ✅ Request deduplication (4 tests)
  - Deduplicates concurrent requests for same resource
  - Does not deduplicate requests with different parameters
- ✅ Cache invalidation (4 tests)
  - Individual cache invalidation (nganyas, corridors, liveNganyas)
  - Invalidate all caches
- ✅ Error handling (3 tests)
  - Handles fetch errors
  - Keeps stale data on background fetch error

### 2. useFollowStore.test.ts (18 tests)

Tests for the Follow store that manages followed nganyas and follow/unfollow actions.

**Coverage:**

- ✅ TTL-based freshness checks (3 tests)
  - Follows: 45s TTL
- ✅ Stale-while-revalidate pattern (3 tests)
- ✅ Optimistic updates - followNganya (3 tests)
  - Optimistically adds nganya to followedIds
  - Rolls back on error
  - Invalidates cache after success
- ✅ Optimistic updates - unfollowNganya (3 tests)
  - Optimistically removes nganya from followedIds
  - Rolls back on error
  - Invalidates cache after success
- ✅ isFollowing selector (3 tests)
  - Returns correct following status
  - Reflects optimistic updates immediately
- ✅ Cache invalidation (1 test)
- ✅ Error handling (2 tests)

### 3. useProfileStore.test.ts (12 tests)

Tests for the Profile store that manages user profile data.

**Coverage:**

- ✅ TTL-based freshness checks (3 tests)
  - Profile: 60s TTL
- ✅ Stale-while-revalidate pattern (3 tests)
- ✅ Optimistic updates (3 tests)
  - Optimistically updates profile
  - Rolls back on error
  - Handles partial updates
- ✅ Cache invalidation (1 test)
- ✅ Error handling (2 tests)

### 4. useSightingStore.test.ts (16 tests)

Tests for the Sighting store that manages user sightings and recent sightings.

**Coverage:**

- ✅ TTL-based freshness checks (5 tests)
  - User Sightings: 60s TTL
  - Recent Sightings: 30s TTL
- ✅ Stale-while-revalidate pattern (4 tests)
- ✅ Post sighting (2 tests)
  - Posts sighting and invalidates caches
  - Handles errors
- ✅ Cache invalidation (2 tests)
- ✅ Error handling (3 tests)

### 5. useAuthStore.test.ts (16 tests)

Tests for the Auth store that manages session and role data.

**Coverage:**

- ✅ TTL-based freshness checks (3 tests)
  - Role: 120s TTL
- ✅ Request deduplication (4 tests)
  - Deduplicates concurrent resolveRole requests
  - Returns cached role when fresh
  - Resolves role when stale or missing
- ✅ Session management (3 tests)
  - Sets session
  - Invalidates role when session is cleared
  - Preserves role when session is set
- ✅ isAuthenticated selector (2 tests)
- ✅ Cache invalidation (1 test)
- ✅ Error handling (2 tests)
- ✅ Loading states (1 test)

### 6. useCrewStore.test.ts (15 tests)

Tests for the Crew store that manages crew bootstrap data with schema validation.

**Coverage:**

- ✅ TTL-based freshness checks (3 tests)
  - Bootstrap: 45s TTL
- ✅ Schema validation (3 tests)
  - Returns cached data when valid and fresh
  - Fetches fresh data when cached data is invalid
  - Throws error when fetched data fails validation
- ✅ Stale-while-revalidate pattern (2 tests)
- ✅ Request deduplication (1 test)
- ✅ setBootstrap (1 test)
- ✅ Cache invalidation (1 test)
- ✅ Error handling (3 tests)
- ✅ Loading states (1 test)

### 7. useAdminStore.test.ts (26 tests)

Tests for the Admin store that manages multiple admin data domains.

**Coverage:**

- ✅ TTL-based freshness checks (5 tests)
  - Overview: 60s TTL
  - Users: 45s TTL
  - Crew Management: 20s TTL
  - Registrations: 15s TTL
  - Registration Detail: 15s TTL
- ✅ Stale-while-revalidate pattern (3 tests)
  - fetchOverview, fetchUsers
- ✅ Optimistic updates - updateUserRole (2 tests)
  - Optimistically updates user role
  - Rolls back on error
- ✅ Crew management mutations (3 tests)
  - assignCrewNganya, unassignCrewNganya
  - Error handling
- ✅ Registration mutations (3 tests)
  - approveRequest, reviewRequest
  - Error handling
- ✅ fetchRegistrationDetail (2 tests)
  - Returns cached detail when same ID and fresh
  - Fetches fresh detail when different ID
- ✅ Cache invalidation (6 tests)
  - Individual cache invalidation for all domains
  - Invalidate all caches
- ✅ Error handling (2 tests)

## Key Testing Patterns

### 1. TTL-Based Freshness Checks

All stores implement consistent TTL checks:

- Returns `true` when `lastFetchedAt` is `null`
- Returns `false` when data is within TTL
- Returns `true` when data exceeds TTL

### 2. Stale-While-Revalidate Pattern

All stores implement the SWR pattern:

- Returns cached data immediately when fresh (no API call)
- Returns stale data immediately and fetches in background when stale
- Fetches fresh data when no cache exists

### 3. Request Deduplication

Stores with concurrent request handling:

- Track in-flight requests using Maps or Promise references
- Return existing promise when request is already in-flight
- Only make one API call for concurrent requests

### 4. Optimistic Updates

Stores with mutations (useFollowStore, useProfileStore, useAdminStore):

- Apply optimistic update immediately
- Track optimistic operations
- Roll back on error
- Invalidate cache after success

### 5. Schema Validation

useCrewStore implements schema validation:

- Validates cached data before returning
- Fetches fresh data when cached data is invalid
- Throws error when fetched data fails validation

### 6. Cache Invalidation

All stores implement cache invalidation:

- Individual cache invalidation methods
- Invalidate all caches method (where applicable)
- Automatic invalidation after mutations

### 7. Error Handling

All stores handle errors consistently:

- Set error state
- Clear loading state
- Keep stale data on background fetch error
- Throw errors for fresh fetches

## Running Tests

```bash
# Run all store tests
npm test -- src/stores/__tests__/

# Run specific store tests
npm test -- src/stores/__tests__/useNganyaStore.test.ts
npm test -- src/stores/__tests__/useFollowStore.test.ts
npm test -- src/stores/__tests__/useProfileStore.test.ts
npm test -- src/stores/__tests__/useSightingStore.test.ts
npm test -- src/stores/__tests__/useAuthStore.test.ts
npm test -- src/stores/__tests__/useCrewStore.test.ts
npm test -- src/stores/__tests__/useAdminStore.test.ts
```

## Test Requirements Validated

These tests verify all requirements from Task 9.1:

✅ TTL-based freshness checks work correctly
✅ Stale-while-revalidate pattern works correctly
✅ Request deduplication works correctly
✅ Optimistic updates work correctly (where applicable)
✅ Schema validation works correctly (useCrewStore)
✅ Cache invalidation works correctly

All 7 Zustand stores are comprehensively tested with 125 passing tests.
