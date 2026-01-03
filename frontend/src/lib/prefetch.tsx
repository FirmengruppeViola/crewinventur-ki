import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../features/auth/useAuth'
import { apiRequest } from './api'

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

/**
 * Prefetch data before navigation for instant page loads.
 * Call on link hover/touch to preload the next page's data.
 */

type PrefetchConfig = {
  queryKey: unknown[]
  queryFn: () => Promise<unknown>
  staleTime?: number
}

export function usePrefetch() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  const prefetch = useCallback(
    (configs: PrefetchConfig | PrefetchConfig[]) => {
      const configArray = Array.isArray(configs) ? configs : [configs]

      configArray.forEach((config) => {
        queryClient.prefetchQuery({
          queryKey: config.queryKey,
          queryFn: config.queryFn,
          staleTime: config.staleTime ?? 1000 * 60 * 5, // 5 min default
        })
      })
    },
    [queryClient]
  )

  // Pre-built prefetch functions for common routes
  const prefetchDashboard = useCallback(() => {
    if (!token) return
    prefetch([
      {
        queryKey: ['locations'],
        queryFn: () => apiRequest('/api/v1/locations', {}, token),
      },
      {
        queryKey: ['products'],
        queryFn: () => apiRequest('/api/v1/products', {}, token),
      },
      {
        queryKey: ['inventory', 'sessions'],
        queryFn: () => apiRequest('/api/v1/inventory/sessions', {}, token),
      },
    ])
  }, [prefetch, token])

  const prefetchLocations = useCallback(() => {
    if (!token) return
    prefetch({
      queryKey: ['locations'],
      queryFn: () => apiRequest('/api/v1/locations', {}, token),
    })
  }, [prefetch, token])

  const prefetchLocation = useCallback(
    (id: string) => {
      if (!token) return
      prefetch({
        queryKey: ['locations', id],
        queryFn: () => apiRequest(`/api/v1/locations/${id}`, {}, token),
      })
    },
    [prefetch, token]
  )

  const prefetchProducts = useCallback(() => {
    if (!token) return
    prefetch({
      queryKey: ['products'],
      queryFn: () => apiRequest('/api/v1/products', {}, token),
    })
  }, [prefetch, token])

  const prefetchProduct = useCallback(
    (id: string) => {
      if (!token) return
      prefetch({
        queryKey: ['products', id],
        queryFn: () => apiRequest(`/api/v1/products/${id}`, {}, token),
      })
    },
    [prefetch, token]
  )

  const prefetchInventory = useCallback(() => {
    if (!token) return
    prefetch([
      {
        queryKey: ['inventory', 'sessions'],
        queryFn: () => apiRequest('/api/v1/inventory/sessions', {}, token),
      },
      {
        queryKey: ['locations'],
        queryFn: () => apiRequest('/api/v1/locations', {}, token),
      },
    ])
  }, [prefetch, token])

  const prefetchSession = useCallback(
    (id: string) => {
      if (!token) return
      prefetch([
        {
          queryKey: ['inventory', 'sessions', id],
          queryFn: () => apiRequest(`/api/v1/inventory/sessions/${id}`, {}, token),
        },
        {
          queryKey: ['inventory', 'sessions', id, 'items'],
          queryFn: () => apiRequest(`/api/v1/inventory/sessions/${id}/items`, {}, token),
        },
      ])
    },
    [prefetch, token]
  )

  const prefetchSettings = useCallback(() => {
    if (!token) return
    prefetch({
      queryKey: ['profile'],
      queryFn: () => apiRequest('/api/v1/profile', {}, token),
    })
  }, [prefetch, token])

  return {
    prefetch,
    prefetchDashboard,
    prefetchLocations,
    prefetchLocation,
    prefetchProducts,
    prefetchProduct,
    prefetchInventory,
    prefetchSession,
    prefetchSettings,
  }
}

// =============================================================================
// PREFETCH LINK COMPONENT
// =============================================================================

import { Link, type LinkProps } from 'react-router-dom'
import { forwardRef, type ReactNode, type MouseEvent, type TouchEvent } from 'react'

type PrefetchLinkProps = LinkProps & {
  prefetchFn?: () => void
  children: ReactNode
}

/**
 * Link component that prefetches data on hover/touch.
 * Use this instead of regular <Link> for smoother navigation.
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLink({ prefetchFn, children, onMouseEnter, onTouchStart, ...props }, ref) {
    const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
      prefetchFn?.()
      onMouseEnter?.(e)
    }

    const handleTouchStart = (e: TouchEvent<HTMLAnchorElement>) => {
      prefetchFn?.()
      onTouchStart?.(e)
    }

    return (
      <Link
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        {...props}
      >
        {children}
      </Link>
    )
  }
)

// =============================================================================
// ROUTE PRELOADER - Preload route chunks
// =============================================================================

// Map of route patterns to their chunk importers
const routeChunks: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('../pages/dashboard/DashboardPage'),
  '/locations': () => import('../pages/locations/LocationsPage'),
  '/products': () => import('../pages/products/ProductsPage'),
  '/inventory': () => import('../pages/inventory/InventoryPage'),
  '/settings': () => import('../pages/settings/SettingsPage'),
  '/invoices': () => import('../pages/invoices/InvoicesPage'),
}

/**
 * Preload the JavaScript chunk for a route.
 * Call this alongside data prefetching for maximum speed.
 */
export function preloadRouteChunk(path: string) {
  // Find matching route pattern
  const matchingRoute = Object.keys(routeChunks).find((pattern) =>
    path.startsWith(pattern)
  )

  if (matchingRoute) {
    routeChunks[matchingRoute]()
  }
}

/**
 * Preload critical routes after login.
 * Uses requestIdleCallback for non-blocking preload.
 */
export function preloadCriticalRoutes() {
  const preload = () => {
    Object.values(routeChunks).forEach((importFn) => importFn())
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 3000 })
  } else {
    setTimeout(preload, 500)
  }
}
