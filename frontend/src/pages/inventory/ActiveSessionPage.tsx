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
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { SessionSkeleton } from '../../components/ui/Skeleton'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { InventoryItemAccordion } from '../../components/inventory/InventoryItemAccordion'
import { useLocation as useLocationData } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import { useCategories } from '../../features/products/useCategories'
import {
  useAddSessionItem,
  useCompleteInventorySession,
  useInventorySession,
  useSessionItems,
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
  const { session: authSession } = useAuth()
  const sessionId = id ?? ''

  const { data: session, isLoading } = useInventorySession(sessionId)
  const { data: items } = useSessionItems(sessionId)
  const { data: products } = useProducts()
  const { data: categories } = useCategories()
  const completeSession = useCompleteInventorySession(sessionId)
  const addItem = useAddSessionItem(sessionId)

  const location = useLocationData(session?.location_id)

  // Sort/Group state
  const [sortBy, setSortBy] = useState<'category' | 'scanned'>('scanned')

  // Expansion state for accordion items
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Manual add form
  const [showManualAdd, setShowManualAdd] = useState(false)

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

  // Group items by category or keep flat
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
      addToast('Produkt hinzugefuegt', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Hinzufuegen fehlgeschlagen',
        'error',
      )
    }
  }

  const handleComplete = async () => {
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
    <div className="bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-4 px-4 py-4">
          <Link viewTransition
            to="/inventory"
            className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors"
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
          >
            <Plus className="h-4 w-4 mr-1" />
            Manuell
          </Button>
        </div>
        {/* Sort Toggle */}
        {items && items.length > 0 && (
          <div className="flex gap-1 px-4 pb-3">
            <button
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                sortBy === 'scanned'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSortBy('scanned')}
            >
              Reihenfolge
            </button>
            <button
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                sortBy === 'category'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSortBy('category')}
            >
              Kategorie
            </button>
          </div>
        )}
      </header>

      {/* Items List */}
      <div className="p-4 space-y-4">
        {/* Scan Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14"
            onClick={() => navigate(`/inventory/sessions/${sessionId}/scan`)}
          >
            <Camera className="mr-2 h-5 w-5" />
            Einzelscan
          </Button>
          <Button
            variant="outline"
            className="h-14"
            onClick={() => navigate(`/inventory/sessions/${sessionId}/shelf-scan`)}
          >
            <Grid3X3 className="mr-2 h-5 w-5" />
            Regal-Scan
          </Button>
        </div>

        {items && items.length > 0 ? (
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <Card key={category} className="p-4">
                {sortBy === 'category' && (
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
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
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        previous_quantity: item.previous_quantity ?? null,
                        quantity_difference: item.quantity_difference ?? null,
                        scanned_at: item.scanned_at ?? null,
                        scan_method: item.scan_method ?? null,
                        ai_confidence: item.ai_confidence ?? null,
                        notes: item.notes ?? undefined,
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
                          addToast('Entfernt', 'success')
                        } catch {
                          addToast('Loeschen fehlgeschlagen', 'error')
                        }
                      }}
                    />
                  )
                })}
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-6 rounded-3xl bg-accent/50 mb-4">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Noch keine Produkte</h3>
            <p className="text-muted-foreground mt-1">
              Nutze die Scan-Buttons oben um Produkte zu erfassen
            </p>
          </div>
        )}

        {/* Complete Session Button */}
        {items && items.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Gesamtwert</p>
                <p className="text-2xl font-bold">{session.total_value.toFixed(2)} EUR</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Produkte</p>
                <p className="text-2xl font-bold">{session.total_items}</p>
              </div>
            </div>
            <Button
              className="w-full h-14"
              onClick={handleComplete}
              loading={completeSession.isPending}
            >
              <Check className="mr-2 h-5 w-5" />
              Session abschliessen
            </Button>
          </Card>
        )}
      </div>

      {/* Manual Add Sheet */}
      <BottomSheet isOpen={showManualAdd} onClose={() => setShowManualAdd(false)}>
        <div className="space-y-5 pb-6">
          <h2 className="text-xl font-bold">Manuell hinzufuegen</h2>

          <Select
            label="Produkt"
            name="productId"
            options={[{ label: 'Produkt waehlen...', value: '' }, ...productOptions]}
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
            className="w-full h-14"
            onClick={handleAddItem}
            loading={addItem.isPending}
            disabled={!productId}
          >
            <Plus className="mr-2 h-5 w-5" />
            Hinzufuegen
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}

