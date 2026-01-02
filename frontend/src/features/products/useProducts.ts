import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../auth/useAuth'

export type Product = {
  id: string
  user_id: string
  name: string
  brand: string | null
  variant: string | null
  size: string | null
  unit: string | null
  barcode: string | null
  category_id: string | null
  image_url: string | null
  last_price: number | null
  last_supplier: string | null
  ai_description: string | null
  ai_confidence: number | null
}

export type ProductInput = {
  name: string
  brand?: string | null
  variant?: string | null
  size?: string | null
  unit?: string | null
  barcode?: string | null
  category_id?: string | null
  image_url?: string | null
}

export function useProducts(params?: { categoryId?: string; query?: string }) {
  const { session } = useAuth()
  const token = session?.access_token

  const queryParams = new URLSearchParams()
  if (params?.categoryId) queryParams.set('category_id', params.categoryId)
  if (params?.query) queryParams.set('q', params.query)

  return useQuery({
    queryKey: ['products', params],
    queryFn: () =>
      apiRequest<Product[]>(
        `/api/v1/products?${queryParams.toString()}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token),
  })
}

export function useProduct(productId?: string) {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ['products', productId],
    queryFn: () =>
      apiRequest<Product>(
        `/api/v1/products/${productId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && productId),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: (payload: ProductInput) =>
      apiRequest<Product>(
        '/api/v1/products',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: (payload: ProductInput) =>
      apiRequest<Product>(
        `/api/v1/products/${productId}`,
        { method: 'PUT', body: JSON.stringify(payload) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', productId] })
    },
  })
}

export function useDeleteProduct(productId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: () =>
      apiRequest<Product>(
        `/api/v1/products/${productId}`,
        { method: 'DELETE' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useBarcodeLookup(code: string) {
  const { session } = useAuth()
  const token = session?.access_token

  return useQuery({
    queryKey: ['products', 'barcode', code],
    queryFn: () =>
      apiRequest<Product>(
        `/api/v1/products/barcode/${code}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && code),
  })
}
