import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, apiUpload } from '../../lib/api'
import { useAuth } from '../auth/useAuth'

export type Invoice = {
  id: string
  user_id: string
  supplier_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  file_url: string
  file_name: string
  file_size: number | null
  status: string
  processing_error: string | null
  processed_at: string | null
  total_amount: number | null
  item_count: number
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  user_id: string
  raw_text: string
  product_name: string
  quantity: number | null
  unit: string | null
  unit_price: number
  total_price: number | null
  matched_product_id: string | null
  match_confidence: number | null
  is_manually_matched: boolean
}

export function useInvoices() {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () =>
      apiRequest<Invoice[]>('/api/v1/invoices', { method: 'GET' }, token),
    enabled: Boolean(token),
  })
}

export function useInvoice(invoiceId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: () =>
      apiRequest<Invoice>(
        `/api/v1/invoices/${invoiceId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && invoiceId),
  })
}

export function useInvoiceItems(invoiceId?: string) {
  const { session } = useAuth()
  const token = session?.access_token
  return useQuery({
    queryKey: ['invoices', invoiceId, 'items'],
    queryFn: () =>
      apiRequest<InvoiceItem[]>(
        `/api/v1/invoices/${invoiceId}/items`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && invoiceId),
  })
}

export function useUploadInvoice() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiUpload<Invoice>('/api/v1/invoices/upload', formData, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useProcessInvoice(invoiceId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: () =>
      apiRequest<Invoice>(
        `/api/v1/invoices/${invoiceId}/process`,
        { method: 'POST' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId, 'items'] })
    },
  })
}

export function useMatchInvoiceItem(invoiceId: string, itemId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: (productId: string) =>
      apiRequest<InvoiceItem>(
        `/api/v1/invoices/${invoiceId}/items/${itemId}/match`,
        { method: 'POST', body: JSON.stringify({ product_id: productId }) },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId, 'items'] })
    },
  })
}
