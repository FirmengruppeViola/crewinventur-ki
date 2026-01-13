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
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['invoices']
  return useQuery<Invoice[]>({
    queryKey,
    queryFn: () =>
      apiRequest<Invoice[]>('/api/v1/invoices', { method: 'GET' }, token),
    enabled: Boolean(token),
    refetchInterval: (query) => {
      const invoices = query.state.data
      const shouldPoll = Boolean(
        invoices?.some(
          (invoice) =>
            invoice.status === 'pending' || invoice.status === 'processing',
        ),
      )
      return shouldPoll ? 2000 : false
    },
    placeholderData: () =>
      queryClient.getQueryData<Invoice[]>(queryKey),
  })
}

export function useInvoice(invoiceId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['invoices', invoiceId]
  return useQuery<Invoice>({
    queryKey,
    queryFn: () =>
      apiRequest<Invoice>(
        `/api/v1/invoices/${invoiceId}`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && invoiceId),
    refetchInterval: (query) => {
      const invoice = query.state.data
      if (!invoice) return false
      const shouldPoll =
        invoice.status === 'pending' || invoice.status === 'processing'
      return shouldPoll ? 2000 : false
    },
    placeholderData: () =>
      invoiceId
        ? queryClient.getQueryData<Invoice>(queryKey)
        : undefined,
  })
}

export function useInvoiceItems(invoiceId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['invoices', invoiceId, 'items']
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<InvoiceItem[]>(
        `/api/v1/invoices/${invoiceId}/items`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && invoiceId),
    placeholderData: () =>
      invoiceId
        ? queryClient.getQueryData<InvoiceItem[]>(queryKey)
        : undefined,
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
      return apiUpload<Invoice>('/api/v1/invoices/upload', formData, token, 120000)
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

type AutoCreateResult = {
  message: string
  created: unknown[]
  count: number
}

/**
 * Auto-create products from unmatched invoice items.
 * Solves the "chicken-egg" problem: upload invoices first, products are created automatically.
 */
export function useAutoCreateProducts(invoiceId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: () =>
      apiRequest<AutoCreateResult>(
        `/api/v1/invoices/${invoiceId}/auto-create-products`,
        { method: 'POST' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId, 'items'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * Get count of unmatched items in an invoice.
 */
export function useUnmatchedCount(invoiceId?: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  const queryKey = ['invoices', invoiceId, 'unmatched-count']
  return useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<{ unmatched_count: number }>(
        `/api/v1/invoices/${invoiceId}/unmatched-count`,
        { method: 'GET' },
        token,
      ),
    enabled: Boolean(token && invoiceId),
    placeholderData: () =>
      invoiceId
        ? queryClient.getQueryData<{ unmatched_count: number }>(queryKey)
        : undefined,
  })
}

type SmartMatchResult = {
  matched_count: number
  failed_count?: number
  total_items?: number
  message: string
  matches?: Array<{
    item_id: string
    product_id: string
    confidence: number
    reason: string
  }>
}

/**
 * AI-powered smart matching for a specific invoice.
 * Uses Gemini to match invoice items to products.
 */
export function useSmartMatchInvoice(invoiceId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: () =>
      apiRequest<SmartMatchResult>(
        `/api/v1/invoices/${invoiceId}/smart-match`,
        { method: 'POST' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId, 'items'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId, 'unmatched-count'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * AI-powered smart matching for ALL unmatched invoice items.
 * Use after bulk-uploading invoices.
 */
export function useSmartMatchAll() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token
  return useMutation({
    mutationFn: () =>
      apiRequest<SmartMatchResult>(
        `/api/v1/invoices/smart-match-all`,
        { method: 'POST' },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
