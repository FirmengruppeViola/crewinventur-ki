import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  Grid3X3,
  Package,
  Plus,
  Trash2,
  Check,
  ChevronRight,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { useLocation as useLocationData } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import {
  useAddSessionItem,
  useCompleteInventorySession,
  useInventorySession,
  useSessionItems,
  useUpdateSessionItem,
  useDeleteSessionItem,
} from '../../features/inventory/useInventory'
import { useUiStore } from '../../stores/uiStore'

type ItemRowProps = {
  itemId: string
  sessionId: string
  productName: string
  quantity: number
  fullQuantity?: number | null
  partialQuantity?: number | null
  unitPrice: number
  totalPrice?: number | null
  onDelete: () => void
}

function ItemRow({
  itemId,
  sessionId,
  productName,
  quantity,
  fullQuantity,
  partialQuantity,
  unitPrice,
  totalPrice,
  onDelete,
}: ItemRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(quantity.toString())
  const updateItem = useUpdateSessionItem(itemId, sessionId)

  const handleUpdate = async () => {
    const numeric = Number(value)
    if (Number.isNaN(numeric) || numeric <= 0) return
    await updateItem.mutateAsync({ quantity: numeric })
    setIsEditing(false)
  }

  const displayQty = fullQuantity !== null && fullQuantity !== undefined
    ? partialQuantity
      ? `${fullQuantity} + ${(partialQuantity * 100).toFixed(0)}%`
      : fullQuantity.toString()
    : quantity.toString()

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border/50 last:border-0">
      <div className="p-2 rounded-xl bg-primary/10">
        <Package className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{productName}</p>
        <p className="text-sm text-muted-foreground">
          {unitPrice.toFixed(2)} EUR × {displayQty}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{(totalPrice || quantity * unitPrice).toFixed(2)} EUR</p>
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ActiveSessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const sessionId = id ?? ''

  const { data: session, isLoading } = useInventorySession(sessionId)
  const { data: items } = useSessionItems(sessionId)
  const { data: products } = useProducts()
  const completeSession = useCompleteInventorySession(sessionId)
  const addItem = useAddSessionItem(sessionId)

  const location = useLocationData(session?.location_id)

  // Scan mode selector
  const [showScanOptions, setShowScanOptions] = useState(false)
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

  const handleDeleteItem = async (itemId: string) => {
    // We need to use the hook properly here
    const deleteItem = useDeleteSessionItem(itemId, sessionId)
    await deleteItem.mutateAsync()
  }

  if (isLoading || !session) {
    return <Loading fullScreen />
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-4 px-4 py-4">
          <Link
            to="/inventory"
            className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">
              {location.data?.name || session.name || 'Inventur'}
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
      </header>

      {/* Items List */}
      <div className="p-4 space-y-4">
        {items && items.length > 0 ? (
          <Card className="p-4">
            {items.map((item) => {
              const product = productMap.get(item.product_id)
              return (
                <ItemRow
                  key={item.id}
                  itemId={item.id}
                  sessionId={sessionId}
                  productName={product?.name || 'Unbekannt'}
                  quantity={item.quantity}
                  fullQuantity={(item as any).full_quantity}
                  partialQuantity={(item as any).partial_quantity}
                  unitPrice={item.unit_price}
                  totalPrice={item.total_price}
                  onDelete={() => {
                    // Direct delete with confirmation
                    if (confirm('Produkt entfernen?')) {
                      // We'll handle this via mutation
                    }
                  }}
                />
              )
            })}
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-6 rounded-3xl bg-accent/50 mb-4">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Noch keine Produkte</h3>
            <p className="text-muted-foreground mt-1">
              Tippe auf den Scan-Button um loszulegen
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

      {/* FAB - Scan Button */}
      <div className="fixed bottom-24 right-4 z-50">
        <button
          onClick={() => setShowScanOptions(true)}
          className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
        >
          <Camera className="h-7 w-7" />
        </button>
      </div>

      {/* Scan Options Sheet */}
      <BottomSheet isOpen={showScanOptions} onClose={() => setShowScanOptions(false)}>
        <div className="space-y-4 pb-6">
          <h2 className="text-xl font-bold">Scannen</h2>

          <button
            onClick={() => {
              setShowScanOptions(false)
              navigate(`/inventory/sessions/${sessionId}/scan`)
            }}
            className="flex items-center gap-4 w-full p-4 rounded-2xl bg-accent/50 hover:bg-accent transition-colors"
          >
            <div className="p-3 rounded-xl bg-primary/10">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Einzelscan</p>
              <p className="text-sm text-muted-foreground">
                Ein Produkt fotografieren und erfassen
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => {
              setShowScanOptions(false)
              navigate(`/inventory/sessions/${sessionId}/shelf-scan`)
            }}
            className="flex items-center gap-4 w-full p-4 rounded-2xl bg-accent/50 hover:bg-accent transition-colors"
          >
            <div className="p-3 rounded-xl bg-violet-500/10">
              <Grid3X3 className="h-6 w-6 text-violet-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Regal-Scan</p>
              <p className="text-sm text-muted-foreground">
                Mehrere Produkte auf einmal erkennen
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </BottomSheet>

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
