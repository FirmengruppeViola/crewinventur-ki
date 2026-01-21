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
  // Neue Anbruch-Felder
  full_quantity?: number | null
  partial_quantity?: number | null
  partial_fill_percent?: number | null
  // Legacy für Kompatibilität
  quantity?: number | null
  unit_price?: number | null
  total_price?: number | null
  previous_quantity?: number | null
  quantity_difference?: number | null
  scanned_at?: string | null
  scan_method?: 'photo' | 'shelf' | 'barcode' | 'manual' | null
  ai_confidence?: number | null
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

export type SessionDifference = {
  product_id: string
  previous_quantity: number | null
  current_quantity: number | null
  quantity_difference: number | null
  products?: { name: string; brand: string | null } | null
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
  full_quantity?: number
  partial_quantity?: number
  partial_fill_percent?: number
  // Legacy für Kompatibilität
  quantity?: number
  unit_price?: number
  notes?: string | null
}

type BundleInput = {
  name: string
  session_ids: string[]
}

export function useInventorySessions() {
  const queryClient = useQueryClient()
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
    placeholderData: () =>
      queryClient.getQueryData<InventorySession[]>([
        'inventory',
        'sessions',
      ]),
  })
}

export function useInventorySession(sessionId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['inventory', 'sessions', sessionId]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<InventorySession>(
        `/api/v1/inventory/sessions/${sessionId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId),
    placeholderData: () =>
      sessionId
        ? queryClient.getQueryData<InventorySession>(queryKey)
        : undefined,
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
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['inventory', 'items', sessionId]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<InventoryItem[]>(
        `/api/v1/inventory/sessions/${sessionId}/items`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId),
    placeholderData: () =>
      sessionId
        ? queryClient.getQueryData<InventoryItem[]>(queryKey)
        : undefined,
  })
}

export function useSessionDifferences(sessionId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['inventory', 'differences', sessionId]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<SessionDifference[]>(
        `/api/v1/inventory/sessions/${sessionId}/differences`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId),
    placeholderData: () =>
      sessionId
        ? queryClient.getQueryData<SessionDifference[]>(queryKey)
        : undefined,
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

export function usePrefillSessionItems(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: () =>
      apiRequest<{ inserted: number; previous_session_id?: string | null }>(
        `/api/v1/inventory/sessions/${sessionId}/prefill`,
        { method: 'POST' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}

export function useInventoryBundles() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['inventory', 'bundles']
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<InventoryBundle[]>(
        '/api/v1/inventory/bundles',
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token),
    placeholderData: () =>
      queryClient.getQueryData<InventoryBundle[]>(queryKey),
  })
}

export function useInventoryBundle(bundleId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['inventory', 'bundles', bundleId]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<InventoryBundle>(
        `/api/v1/inventory/bundles/${bundleId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && bundleId),
    placeholderData: () =>
      bundleId
        ? queryClient.getQueryData<InventoryBundle>(queryKey)
        : undefined,
  })
}

export function useInventoryBundleSessions(bundleId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['inventory', 'bundles', bundleId, 'sessions']
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<BundleSession[]>(
        `/api/v1/inventory/bundles/${bundleId}/sessions`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && bundleId),
    placeholderData: () =>
      bundleId
        ? queryClient.getQueryData<BundleSession[]>(queryKey)
        : undefined,
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
  const queryClient = useQueryClient()
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
    placeholderData: () =>
      sessionId
        ? queryClient.getQueryData<MissingPricesResponse>([
            'export',
            'missing-prices',
            sessionId,
          ])
        : undefined,
  })
}

export function useExportValidation(sessionId?: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['export', 'validate', sessionId]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<ExportValidation>(
        `/api/v1/export/session/${sessionId}/validate`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && sessionId && (options?.enabled ?? true)),
    placeholderData: () =>
      sessionId
        ? queryClient.getQueryData<ExportValidation>(queryKey)
        : undefined,
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
