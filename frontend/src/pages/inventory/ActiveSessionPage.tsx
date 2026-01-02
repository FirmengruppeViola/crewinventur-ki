import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
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
  unitPrice: number
}

function ItemRow({ itemId, sessionId, productName, quantity, unitPrice }: ItemRowProps) {
  const [value, setValue] = useState(quantity.toString())
  const updateItem = useUpdateSessionItem(itemId, sessionId)
  const deleteItem = useDeleteSessionItem(itemId, sessionId)
  const priceValue = Number(unitPrice)

  const handleUpdate = async () => {
    const numeric = Number(value)
    if (Number.isNaN(numeric) || numeric <= 0) return
    await updateItem.mutateAsync({ quantity: numeric })
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 text-sm">
      <div>
        <p className="font-medium text-gray-900">{productName}</p>
        <p className="text-xs text-gray-500">
          Preis: {Number.isFinite(priceValue) ? priceValue.toFixed(2) : '-'} EUR
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button size="sm" variant="secondary" onClick={handleUpdate}>
          Update
        </Button>
        <Button size="sm" variant="danger" onClick={() => deleteItem.mutateAsync()}>
          X
        </Button>
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

  const productOptions = useMemo(() => {
    return (
      products?.map((product) => ({
        label: product.name,
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
      addToast('Produkt hinzugefuegt.', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Hinzufuegen fehlgeschlagen.',
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
        error instanceof Error ? error.message : 'Session Abschluss fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isLoading || !session) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {location.data?.name || 'Inventur'}
          </h1>
          <p className="text-sm text-gray-600">Status: {session.status}</p>
        </div>
        <Link to="/inventory">
          <Button variant="secondary">Zurueck</Button>
        </Link>
      </header>

      <Card title="Produkt hinzufuegen">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Produkt"
            name="productId"
            options={[{ label: 'Produkt waehlen', value: '' }, ...productOptions]}
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          />
          <Input
            label="Menge"
            name="quantity"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <Input
            label="Einzelpreis"
            name="unitPrice"
            type="number"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
          />
        </div>
        <div className="mt-3">
          <Button onClick={handleAddItem} loading={addItem.isPending}>
            Hinzufuegen
          </Button>
        </div>
      </Card>

      <Card title="Erfasste Items">
        {items && items.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const product = productMap.get(item.product_id)
              return (
                <ItemRow
                  key={item.id}
                  itemId={item.id}
                  sessionId={sessionId}
                  productName={product?.name || 'Unbekannt'}
                  quantity={item.quantity}
                  unitPrice={item.unit_price}
                />
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Noch keine Produkte erfasst.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Gesamtwert</p>
            <p className="text-lg font-semibold">
              {Number(session.total_value).toFixed(2)} EUR
            </p>
          </div>
          <Button onClick={handleComplete} loading={completeSession.isPending}>
            Session abschliessen
          </Button>
        </div>
      </Card>
    </div>
  )
}
