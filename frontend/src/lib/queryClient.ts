import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'
import { apiRequest } from './api'

// =============================================================================
// 2026 BEST PRACTICES - React Query Configuration for Hybrid Apps
// =============================================================================

/**
 * Smart retry logic:
 * - Don't retry on 4xx errors (client errors)
 * - Retry network failures up to 2 times
 * - Exponential backoff
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // Don't retry more than 2 times
  if (failureCount >= 2) return false

  // Don't retry client errors (4xx)
  if (error instanceof Error) {
    const status = (error as { status?: number }).status
    if (status && status >= 400 && status < 500 && status !== 429) {
      return false
    }
    const message = error.message.toLowerCase()
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('400') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found')
    ) {
      return false
    }
  }

  // Retry network errors
  return true
}

/**
 * Exponential backoff for retries
 */
function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 10000)
}

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // =================================================================
      // CACHING - Keep data fresh but avoid unnecessary refetches
      // =================================================================
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache for instant back navigation

      // =================================================================
      // REFETCH BEHAVIOR - Smart refetching for hybrid apps
      // =================================================================
      refetchOnWindowFocus: false, // Don't refetch when app regains focus (annoying on mobile)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch on mount if stale

      // =================================================================
      // RETRY LOGIC - Don't spam the server on errors
      // =================================================================
      retry: shouldRetry,
      retryDelay,

      // =================================================================
      // NETWORK MODE - Handle offline gracefully
      // =================================================================
      networkMode: 'offlineFirst', // Return cached data immediately, fetch in background

      // =================================================================
      // STRUCTURAL SHARING - Performance optimization
      // =================================================================
      structuralSharing: true, // Reuse unchanged parts of data (default)
    },

    mutations: {
      // =================================================================
      // MUTATION CONFIG - Optimistic updates, smart retries
      // =================================================================
      retry: 1, // Retry mutations once on failure
      retryDelay: 1000,
      networkMode: 'offlineFirst', // Queue mutations when offline

      // Global error handler for mutations
      onError: (error) => {
        console.error('Mutation failed:', error)
        // Could show toast here via global state
      },
    },
  },
}

export const queryClient = new QueryClient(queryClientConfig)

// =============================================================================
// QUERY INVALIDATION HELPERS
// =============================================================================

/**
 * Invalidate all queries for a specific entity type.
 * Use after create/update/delete operations.
 */
export function invalidateQueries(keys: string[]) {
  keys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] })
  })
}

/**
 * Optimistic update helper.
 * Updates cache immediately, rolls back on error.
 */
export function optimisticUpdate<T>(
  queryKey: unknown[],
  updater: (old: T | undefined) => T
) {
  const previousData = queryClient.getQueryData<T>(queryKey)
  queryClient.setQueryData(queryKey, updater)
  return previousData
}

/**
 * Rollback optimistic update on error.
 */
export function rollbackUpdate<T>(queryKey: unknown[], previousData: T) {
  queryClient.setQueryData(queryKey, previousData)
}

// =============================================================================
// CACHE WARMING - Preload data for instant navigation
// =============================================================================

/**
 * Warm the cache with initial data after login.
 * Call this immediately after successful authentication.
 */
export async function warmCache(token: string) {
  const endpoints = [
    { key: ['locations'], url: '/api/v1/locations' },
    { key: ['products'], url: '/api/v1/products' },
    { key: ['inventory', 'sessions'], url: '/api/v1/inventory/sessions' },
  ]

  // Fetch all in parallel
  await Promise.allSettled(
    endpoints.map(async ({ key, url }) => {
      try {
        const data = await apiRequest(url, { method: 'GET' }, token)
        queryClient.setQueryData(key, data)
      } catch {
        // Ignore errors during cache warming
      }
    })
  )
}
