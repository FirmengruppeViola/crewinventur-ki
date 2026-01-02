import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../auth/useAuth'

export type Category = {
  id: string
  name: string
  parent_id: string | null
  icon: string | null
  sort_order: number | null
  is_system: boolean
}

export type CategoryInput = {
  name: string
  parent_id?: string | null
  icon?: string | null
  sort_order?: number | null
}

export function useCategories() {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      apiRequest<Category[]>(
        '/api/v1/categories',
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: (payload: CategoryInput) =>
      apiRequest<Category>(
        '/api/v1/categories',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
