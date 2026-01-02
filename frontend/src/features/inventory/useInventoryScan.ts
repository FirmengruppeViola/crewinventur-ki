import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// =====================================================
// Types
// =====================================================

export type ProductRecognition = {
  product_name: string
  brand: string | null
  variant: string | null
  size_ml: number | null
  size_display: string | null
  category: string | null
  packaging: string | null
  confidence: number
  barcode: string | null
  visible_count?: number // For shelf scans
}

export type MatchedProduct = {
  id: string
  name: string
  brand: string | null
  variant: string | null
  size: string | null
  barcode: string | null
  last_price: number | null
  category_id: string | null
  image_url: string | null
}

export type DuplicateInSession = {
  id: string
  full_quantity: number | null
  partial_quantity: number | null
  quantity: number
  unit_price: number
}

export type ScanResult = {
  recognized_product: ProductRecognition
  matched_product: MatchedProduct | null
  is_new: boolean
  duplicate_in_session: DuplicateInSession | null
  suggested_quantity: number | null
}

export type ShelfScanResult = {
  products: ScanResult[]
  total_recognized: number
}

// Input for adding scanned item to session
export type ScanItemInput = {
  product_id: string
  full_quantity: number
  partial_quantity?: number
  partial_fill_percent?: number
  unit_price?: number
  notes?: string
  scan_method?: 'photo' | 'shelf' | 'barcode' | 'manual'
  ai_confidence?: number
  ai_suggested_quantity?: number
  merge_mode?: 'add' | 'replace'
}

// =====================================================
// Hooks
// =====================================================

/**
 * Scan a single product image for inventory
 */
export function useInventoryScan(sessionId: string) {
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (image: File | string): Promise<ScanResult> => {
      const isFile = image instanceof File

      if (isFile) {
        // File upload
        const formData = new FormData()
        formData.append('image', image)
        formData.append('auto_create', 'true')

        const response = await fetch(
          `${API_BASE}/api/v1/inventory/sessions/${sessionId}/scan`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail || 'Scan failed')
        }

        return response.json()
      } else {
        // Base64 string
        const response = await fetch(
          `${API_BASE}/api/v1/inventory/sessions/${sessionId}/scan`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image,
              auto_create: true,
            }),
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail || 'Scan failed')
        }

        return response.json()
      }
    },
  })
}

/**
 * Scan a shelf/rack image for multiple products
 */
export function useShelfScan(sessionId: string) {
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (image: File | string): Promise<ShelfScanResult> => {
      const isFile = image instanceof File

      if (isFile) {
        const formData = new FormData()
        formData.append('image', image)
        formData.append('auto_create', 'true')

        const response = await fetch(
          `${API_BASE}/api/v1/inventory/sessions/${sessionId}/scan-shelf`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail || 'Shelf scan failed')
        }

        return response.json()
      } else {
        const response = await fetch(
          `${API_BASE}/api/v1/inventory/sessions/${sessionId}/scan-shelf`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image,
              auto_create: true,
            }),
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.detail || 'Shelf scan failed')
        }

        return response.json()
      }
    },
  })
}

/**
 * Add scanned item to inventory session
 * Wrapper around the standard add item with scan-specific defaults
 */
export function useAddScannedItem(sessionId: string) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const token = session?.access_token

  return useMutation({
    mutationFn: async (payload: ScanItemInput) => {
      const response = await fetch(
        `${API_BASE}/api/v1/inventory/sessions/${sessionId}/items`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            scan_method: payload.scan_method || 'photo',
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to add item')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'sessions', sessionId] })
    },
  })
}
