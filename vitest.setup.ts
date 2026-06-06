import { expect, afterEach, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/react'

// Mock Supabase auth for all tests
const mockSession = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  access_token: 'test-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: mockSession },
          error: null,
        }),
      ),
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: mockSession.user },
          error: null,
        }),
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
