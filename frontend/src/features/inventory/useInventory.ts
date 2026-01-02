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
