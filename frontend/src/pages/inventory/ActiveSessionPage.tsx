import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import {
  ArrowLeft,
  Package,
  Plus,
  Check,
  Camera,
  Grid3X3,
  TrendingUp,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { SessionSkeleton } from '../../components/ui/Skeleton'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Modal } from '../../components/ui/Modal'
import { InventoryItemAccordion } from '../../components/inventory/InventoryItemAccordion'
import { useLocation as useLocationData } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import { useCategories } from '../../features/products/useCategories'
import {
  useAddSessionItem,
  useCompleteInventorySession,
  useInventorySession,
  useSessionItems,
  useExportValidation,
  usePrefillSessionItems,
} from '../../features/inventory/useInventory'
import { useAuth } from '../../features/auth/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useUiStore } from '../../stores/uiStore'
import { apiRequest } from '../../lib/api'

export function ActiveSessionPage() {
  const { id } = useParams()
  const navigate = useViewNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const queryClient = useQueryClient()
  const { session: authSession, isOwner } = useAuth()
  const sessionId = id ?? ''
 
  const { data: session, isLoading } = useInventorySession(sessionId)
  const { data: items } = useSessionItems(sessionId)
  const { data: products } = useProducts()
  const { data: categories } = useCategories()
  const completeSession = useCompleteInventorySession(sessionId)
  const addItem = useAddSessionItem(sessionId)
  const prefillSession = usePrefillSessionItems(sessionId)
  const { data: validation } = useExportValidation(sessionId, { enabled: isOwner })
 
  const location = useLocationData(session?.location_id)
 
  const [sortBy, setSortBy] = useState<'category' | 'scanned'>('scanned')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
 
  const productOptions = useMemo(() => {
    return (
      products?.map((product) => ({
        label: `${product.brand ? product.brand + ' ' : ''}${product.name}`,
        value: product.id,
      })) ?? []
    )
  }, [products])
 
  const productMap = useMemo(() => {
    return new Map(products?.map((product) => [product.id, product]) ?? [])
  }, [products])
 
  const categoryMap = useMemo(() => {
    return new Map(categories?.map((cat) => [cat.id, cat.name]) ?? [])
  }, [categories])
 
  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) return {}
    if (sortBy === 'scanned') {
      return { 'Alle Produkte': items }
    }
    return items.reduce((acc, item) => {
      const product = productMap.get(item.product_id)
      const categoryName = product?.category_id
        ? categoryMap.get(product.category_id) || 'Sonstiges'
        : 'Sonstiges'
      if (!acc[categoryName]) acc[categoryName] = []
      acc[categoryName].push(item)
      return acc
    }, {} as Record<string, typeof items>)
  }, [items, productMap, categoryMap, sortBy])
 
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
 
  const handleAddItem = async () => {
    if (!productId) return
    const qty = Number(quantity)
    if (Number.isNaN(qty) || qty <= 0) return
    const price = unitPrice ? Number(unitPrice) : undefined
 
    try {
      await addItem.mutateAsync({
        product_id: productId,
        quantity: qty,
        unit_price: price,
      })
      setQuantity('1')
      setUnitPrice('')
      setProductId('')
      setShowManualAdd(false)
      addToast('Produkt hinzugefügt', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Hinzufügen fehlgeschlagen',
        'error',
      )
    }
  }
 
  const handleComplete = async (force: boolean = false) => {
    if (!items || items.length === 0) {
      addToast('Keine Produkte erfasst.', 'info')
      return
    }
    if (
      isOwner &&
      validation &&
      !validation.valid &&
      !force
    ) {
      setShowCompleteModal(true)
      return
    }
    try {
      await completeSession.mutateAsync()
      navigate(`/inventory/sessions/${sessionId}/summary`)
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Abschluss fehlgeschlagen',
        'error',
      )
    }
  }
 
  if (isLoading || !session) {
    return <SessionSkeleton />
  }
 
  return (
    <div className="bg-background min-h-screen">
      <header className="sticky top-0 z-10 glass-safe border-b border-border safe-area-top">
        <div className="flex items-center gap-4 px-4 py-4">
          <Link viewTransition
            to="/inventory"
            className="p-2 -ml-2 rounded-xl hover:bg-primary/10 transition-colors hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-bold truncate"
              style={{ viewTransitionName: `inventory-session-${session.id}` }}
            >
              {location?.data?.name || session.name || 'Inventur'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {items?.length || 0} Produkte · {session.total_value.toFixed(2)} EUR
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManualAdd(true)}
            className="hover:bg-primary/10"
          >
            <Plus className="h-4 w-4 mr-1" />
            Manuell
          </Button>
        </div>
        
        {items && items.length > 0 && (
          <div className="flex gap-1 px-4 pb-3">
            <button
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                sortBy === 'scanned'
                  ? 'gradient-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
              onClick={() => setSortBy('scanned')}
            >
              Reihenfolge
            </button>
            <button
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                sortBy === 'category'
                  ? 'gradient-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
              onClick={() => setSortBy('category')}
            >
              Kategorie
            </button>
          </div>
        )}
      </header>
 
      <div className="p-4 space-y-4 pb-40">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14 hover:border-primary/50 hover:scale-[1.02] active:scale-95 transition-all"
            onClick={() => navigate(`/inventory/sessions/${sessionId}/scan`)}
          >
            <Camera className="mr-2 h-5 w-5" />
            Einzelscan
          </Button>
          <Button
            variant="outline"
            className="h-14 hover:border-primary/50 hover:scale-[1.02] active:scale-95 transition-all"
            onClick={() => navigate(`/inventory/sessions/${sessionId}/shelf-scan`)}
          >
            <Grid3X3 className="mr-2 h-5 w-5" />
            Regal-Scan
          </Button>
        </div>
 
        {items && items.length > 0 ? (
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([category, categoryItems], index) => (
              <Card key={category} className="glass-card p-4 hover:scale-[1.01] transition-transform" style={{ animationDelay: `${index * 50}ms` }}>
                {sortBy === 'category' && (
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                    {category} ({categoryItems.length})
                  </h3>
                )}
                {categoryItems.map((item) => {
                  const product = productMap.get(item.product_id)
                  return (
                    <InventoryItemAccordion
                      key={item.id}
                      item={{
                        id: item.id,
                        session_id: sessionId,
                        product_id: item.product_id,
                        full_quantity: item.full_quantity ?? null,
                        partial_quantity: item.partial_quantity ?? null,
                        partial_fill_percent: item.partial_fill_percent ?? null,
                        quantity: item.quantity ?? null,
                        unit_price: item.unit_price ?? null,
                        total_price: item.total_price ?? null,
                        previous_quantity: item.previous_quantity ?? null,
                        quantity_difference: item.quantity_difference ?? null,
                        scanned_at: item.scanned_at ?? null,
                        scan_method: item.scan_method ?? null,
                        ai_confidence: item.ai_confidence ?? null,
                        notes: item.notes ?? null,
                      }}
                      product={{
                        name: product?.name || 'Unbekannt',
                        brand: product?.brand || undefined,
                      }}
                      isExpanded={expandedItemId === item.id}
                      onToggle={() =>
                        setExpandedItemId(expandedItemId === item.id ? null : item.id)
                      }
                      onUpdate={async (updates) => {
                        try {
                          const token = authSession?.access_token
                          await apiRequest(
                            `/api/v1/inventory/items/${item.id}`,
                            { method: 'PUT', body: JSON.stringify(updates) },
                            token,
                          )
                          queryClient.invalidateQueries({
                            queryKey: ['inventory', 'items', sessionId],
                          })
                          queryClient.invalidateQueries({
                            queryKey: ['inventory', 'sessions', sessionId],
                          })
                          addToast('Gespeichert', 'success')
                        } catch {
                          addToast('Speichern fehlgeschlagen', 'error')
                        }
                      }}
                      onDelete={async () => {
                        if (!confirm('Produkt entfernen?')) return
                        if (deletingItemId) return
                        setDeletingItemId(item.id)
                        try {
                          const token = authSession?.access_token
                          await apiRequest(
                            `/api/v1/inventory/items/${item.id}`,
                            { method: 'DELETE' },
                            token,
                          )
                          queryClient.invalidateQueries({
                            queryKey: ['inventory', 'items', sessionId],
                          })
                          queryClient.invalidateQueries({
                            queryKey: ['inventory', 'sessions', sessionId],
                          })
                          addToast('Produkt entfernt', 'info', {
                            label: 'Rückgängig',
                            onAction: async () => {
                              try {
                                const restorePayload: Record<string, unknown> = {
                                  product_id: item.product_id,
                                  unit_price: item.unit_price ?? undefined,
                                  notes: item.notes ?? undefined,
                                  scan_method: item.scan_method ?? undefined,
                                  ai_confidence: item.ai_confidence ?? undefined,
                                }
                                if (
                                  item.full_quantity !== null ||
                                  item.partial_quantity !== null
                                ) {
                                  restorePayload.full_quantity = item.full_quantity ?? 0
                                  restorePayload.partial_quantity =
                                    item.partial_quantity ?? 0
                                  restorePayload.partial_fill_percent =
                                    item.partial_fill_percent ?? 0
                                } else {
                                  restorePayload.quantity = item.quantity ?? 0
                                }
                                await apiRequest(
                                  `/api/v1/inventory/sessions/${sessionId}/items`,
                                  {
                                    method: 'POST',
                                    body: JSON.stringify(restorePayload),
                                  },
                                  token,
                                )
                                queryClient.invalidateQueries({
                                  queryKey: ['inventory', 'items', sessionId],
                                })
                                queryClient.invalidateQueries({
                                  queryKey: ['inventory', 'sessions', sessionId],
                                })
                                addToast('Wiederhergestellt', 'success')
                              } catch (restoreError) {
                                addToast(
                                  restoreError instanceof Error
                                    ? restoreError.message
                                    : 'Wiederherstellen fehlgeschlagen',
                                  'error',
                                )
                              }
                            },
                          })
                        } catch {
                          addToast('Löschen fehlgeschlagen', 'error')
                        } finally {
                          setDeletingItemId(null)
                        }
                      }}
                      isDeleting={deletingItemId === item.id}
                    />
                  )
                })}
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 mb-4 animate-float">
              <Package className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Noch keine Produkte</h3>
            <p className="text-muted-foreground mt-2">
              Nutze die Scan-Buttons um Produkte zu erfassen
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={async () => {
                try {
                  const result = await prefillSession.mutateAsync()
                  addToast(
                    result.inserted > 0
                      ? `${result.inserted} Produkte übernommen`
                      : 'Keine Produkte gefunden',
                    'success',
                  )
                } catch (error) {
                  addToast(
                    error instanceof Error ? error.message : 'Übernahme fehlgeschlagen',
                    'error',
                  )
                }
              }}
              loading={prefillSession.isPending}
            >
              Letzte Inventur übernehmen
            </Button>
          </div>
        )}
 
        {items && items.length > 0 && (
          <Card className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Gesamtwert</p>
                <p className="text-2xl font-bold text-foreground">{session.total_value.toFixed(2)} EUR</p>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Produkte</p>
                  <p className="text-2xl font-bold text-foreground">{session.total_items}</p>
                </div>
              </div>
            </div>
            <Button
              className="w-full h-14 shadow-glow hover:shadow-glow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
              onClick={() => handleComplete()}
              loading={completeSession.isPending}
            >
              <Check className="mr-2 h-5 w-5" />
              Session abschließen
            </Button>
          </Card>
        )}
      </div>
 
      <BottomSheet isOpen={showManualAdd} onClose={() => setShowManualAdd(false)}>
        <div className="space-y-5 pb-6">
          <h2 className="text-xl font-bold">Manuell hinzufügen</h2>
 
          <Select
            label="Produkt"
            name="productId"
            options={[{ label: 'Produkt wählen...', value: '' }, ...productOptions]}
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          />
 
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Menge"
              name="quantity"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <Input
              label="Einzelpreis (optional)"
              name="unitPrice"
              type="number"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              placeholder="Aus Produkt"
            />
          </div>
 
          <Button
            className="w-full h-14 shadow-glow"
            onClick={handleAddItem}
            loading={addItem.isPending}
            disabled={!productId}
          >
            <Plus className="mr-2 h-5 w-5" />
            Hinzufügen
          </Button>
        </div>
      </BottomSheet>

      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Preise fehlen"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {validation?.missing_count ?? 0} Produkte haben keinen Preis. Für den Export
            sollten Preise nachgetragen werden.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCompleteModal(false)
                navigate(`/inventory/sessions/${sessionId}/price-review`)
              }}
            >
              Preise nachtragen
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setShowCompleteModal(false)
                await handleComplete(true)
              }}
            >
              Trotzdem abschließen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
