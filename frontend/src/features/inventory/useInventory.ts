import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../auth/useAuth'

export type InventorySession = {
  id: string
  user_id: string
  location_id: string
  name: string | null
  status: string
  started_at: string | null
  completed_at: string | null
  total_items: number
  total_value: number
  previous_session_id: string | null
}

export type InventoryItem = {
  id: string
  session_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  previous_quantity: number | null
  quantity_difference: number | null
  notes?: string | null
}

export type InventoryBundle = {
  id: string
  user_id: string
  name: string
  created_at: string | null
  completed_at: string | null
  total_sessions: number
  total_items: number
  total_value: number
}

export type BundleSession = {
  session_id: string
  location_name: string
  completed_at: string | null
  total_items: number
  total_value: number
}

type SessionInput = {
  location_id: string
  name?: string | null
}

type ItemInput = {
  product_id: string
  quantity: number
  unit_price?: number
}

type ItemUpdate = {
  quantity?: number
  unit_price?: number
  notes?: string | null
}

type BundleInput = {
  name: string
  session_ids: string[]
}

export function useInventorySessions() {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['inventory', 'sessions'],
    queryFn: () =>
      apiRequest<InventorySession[]>(
        '/api/v1/inventory/sessions',
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token),
  })
}

export function useInventorySession(sessionId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['inventory', 'sessions', sessionId],
    queryFn: () =>
      apiRequest<InventorySession>(
        `/api/v1/inventory/sessions/${sessionId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId),
  })
}

export function useCreateInventorySession() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (payload: SessionInput) =>
      apiRequest<InventorySession>(
        '/api/v1/inventory/sessions',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions'] })
    },
  })
}

export function useUpdateInventorySession(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (payload: { name?: string; status?: string }) =>
      apiRequest<InventorySession>(
        `/api/v1/inventory/sessions/${sessionId}`,
        { method: 'PUT', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}

export function useCompleteInventorySession(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: () =>
      apiRequest<InventorySession>(
        `/api/v1/inventory/sessions/${sessionId}/complete`,
        { method: 'POST' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}

export function useSessionItems(sessionId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['inventory', 'items', sessionId],
    queryFn: () =>
      apiRequest<InventoryItem[]>(
        `/api/v1/inventory/sessions/${sessionId}/items`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId),
  })
}

export function useAddSessionItem(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (payload: ItemInput) =>
      apiRequest<InventoryItem>(
        `/api/v1/inventory/sessions/${sessionId}/items`,
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}

export function useUpdateSessionItem(itemId: string, sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (payload: ItemUpdate) =>
      apiRequest<InventoryItem>(
        `/api/v1/inventory/items/${itemId}`,
        { method: 'PUT', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}

export function useDeleteSessionItem(itemId: string, sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: () =>
      apiRequest<InventoryItem>(
        `/api/v1/inventory/items/${itemId}`,
        { method: 'DELETE' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}

export function useInventoryBundles() {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['inventory', 'bundles'],
    queryFn: () =>
      apiRequest<InventoryBundle[]>(
        '/api/v1/inventory/bundles',
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token),
  })
}

export function useInventoryBundle(bundleId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['inventory', 'bundles', bundleId],
    queryFn: () =>
      apiRequest<InventoryBundle>(
        `/api/v1/inventory/bundles/${bundleId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && bundleId),
  })
}

export function useInventoryBundleSessions(bundleId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['inventory', 'bundles', bundleId, 'sessions'],
    queryFn: () =>
      apiRequest<BundleSession[]>(
        `/api/v1/inventory/bundles/${bundleId}/sessions`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && bundleId),
  })
}

export function useCreateInventoryBundle() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (payload: BundleInput) =>
      apiRequest<InventoryBundle>(
        '/api/v1/inventory/bundles',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'bundles'] })
    },
  })
}

export function useDeleteInventoryBundle() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (bundleId: string) =>
      apiRequest<{ message: string }>(
        `/api/v1/inventory/bundles/${bundleId}`,
        { method: 'DELETE' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'bundles'] })
    },
  })
}

// === Price Validation Hooks ===

export type MissingPriceItem = {
  item_id: string
  product_id: string
  product_name: string
  product_brand: string | null
  quantity: number
  unit_price: number | null
}

export type MissingPricesResponse = {
  count: number
  items: MissingPriceItem[]
}

export type ExportValidation = {
  valid: boolean
  message: string
  missing_count: number
}

export function useMissingPrices(sessionId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['export', 'missing-prices', sessionId],
    queryFn: () =>
      apiRequest<MissingPricesResponse>(
        `/api/v1/export/session/${sessionId}/missing-prices`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId),
  })
}

export function useExportValidation(sessionId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['export', 'validate', sessionId],
    queryFn: () =>
      apiRequest<ExportValidation>(
        `/api/v1/export/session/${sessionId}/validate`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId),
  })
}

export function useUpdateItemPrice(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: ({ itemId, unitPrice }: { itemId: string; unitPrice: number }) =>
      apiRequest<{ message: string; item_id: string; new_total: number }>(
        `/api/v1/export/session/${sessionId}/items/${itemId}/price`,
        { method: 'PUT', body: JSON.stringify({ unit_price: unitPrice }) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export', 'missing-prices', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['export', 'validate', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}
