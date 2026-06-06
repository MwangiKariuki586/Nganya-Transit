import { useState, useCallback } from 'react'
import { retryWithBackoff, type RetryOptions } from '@/lib/utils/retry'

interface UseRetryResult<T> {
  execute: () => Promise<T | undefined>
  isRetrying: boolean
  retryCount: number
}

/**
 * Hook to wrap any async operation with retry + UI state.
 * Call `execute()` to retry the operation with exponential backoff.
 */
export function useRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions,
): UseRetryResult<T> {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const execute = useCallback(async () => {
    setIsRetrying(true)
    try {
      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelay: 1000,
        ...options,
        onRetry: (attempt, error) => {
          setRetryCount(attempt)
          options?.onRetry?.(attempt, error)
        },
      })
      return result
    } catch {
      return undefined
    } finally {
      setIsRetrying(false)
      setRetryCount(0)
    }
  }, [operation, options])

  return { execute, isRetrying, retryCount }
}
