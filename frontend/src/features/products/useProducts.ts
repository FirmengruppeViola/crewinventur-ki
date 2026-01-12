import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { useMemo } from 'react'

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
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    if (params?.categoryId) p.set('category_id', params.categoryId)
    if (params?.query) p.set('q', params.query)
    return p
  }, [params?.categoryId, params?.query])
  
  const queryString = queryParams.toString()
  const url = queryString ? `/api/v1/products?${queryString}` : '/api/v1/products'

  const queryKey = ['products', queryString]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<Product[]>(
        url,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: () =>
      queryClient.getQueryData<Product[]>(queryKey),
  })
}

export function useProduct(productId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  const queryKey = ['products', productId]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<Product>(
        `/api/v1/products/${productId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && productId),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: () =>
      productId
        ? queryClient.getQueryData<Product>(queryKey)
        : undefined,
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
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  const queryKey = ['products', 'barcode', code]
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<Product>(
        `/api/v1/products/barcode/${code}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && code),
    placeholderData: () =>
      code ? queryClient.getQueryData<Product>(queryKey) : undefined,
  })
}
