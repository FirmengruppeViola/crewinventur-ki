import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../auth/useAuth'

export type UnitSize = {
  id: string
  category: string
  value: string
  value_ml: number | null
  sort_order: number | null
  is_system: boolean
}

/**
 * Hook to fetch unit sizes, optionally filtered by category.
 * Returns system units + user-defined units.
 *
 * @param category - Optional category filter ('spirituosen', 'bier', 'wein', 'food', 'material')
 */
export function useUnitSizes(category?: string) {
  const { session } = useAuth()
  const token = session?.access_token

  const url = category
    ? `/api/v1/unit-sizes?category=${encodeURIComponent(category)}`
    : '/api/v1/unit-sizes'

  return useQuery({
    queryKey: ['unit-sizes', category ?? 'all'],
    queryFn: () => apiRequest<UnitSize[]>(url, { method: 'GET' }, token),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000, // 5 minutes - unit sizes don't change often
  })
}

/**
 * Get unit size options formatted for Select component.
 */
export function useUnitSizeOptions(category?: string) {
  const { data: unitSizes, isLoading } = useUnitSizes(category)

  const options = (unitSizes || []).map((unit) => ({
    label: unit.value,
    value: unit.id,
  }))

  return { options, isLoading }
}
