import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../auth/useAuth'

export type Location = {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type LocationInput = {
  name: string
  description?: string | null
}

export function useLocations() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ['locations'],
    queryFn: () =>
      apiRequest<Location[]>('/api/v1/locations', { method: 'GET' }, token),
    enabled: Boolean(token),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: () =>
      queryClient.getQueryData<Location[]>(['locations']),
  })
}

export function useLocation(locationId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ['locations', locationId],
    queryFn: () =>
      apiRequest<Location>(
        `/api/v1/locations/${locationId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && locationId),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: () =>
      locationId
        ? queryClient.getQueryData<Location>(['locations', locationId])
        : undefined,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: (payload: LocationInput) =>
      apiRequest<Location>(
        '/api/v1/locations',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useUpdateLocation(locationId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: (payload: LocationInput) =>
      apiRequest<Location>(
        `/api/v1/locations/${locationId}`,
        { method: 'PUT', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['locations', locationId] })
    },
  })
}

export function useDeleteLocation(locationId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: () =>
      apiRequest<Location>(
        `/api/v1/locations/${locationId}`,
        { method: 'DELETE' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}
