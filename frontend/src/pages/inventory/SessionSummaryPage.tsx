import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { useLocation as useLocationData } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import { useInventorySession, useSessionItems } from '../../features/inventory/useInventory'
import { useAuth } from '../../features/auth/useAuth'

export function SessionSummaryPage() {
  const { id } = useParams()
  const sessionId = id ?? ''
  const { session: authSession } = useAuth()
  const { data: session, isLoading } = useInventorySession(sessionId)
  const { data: items } = useSessionItems(sessionId)
  const { data: products } = useProducts()

  const location = useLocationData(session?.location_id)
  const productMap = new Map(products?.map((product) => [product.id, product]) ?? [])

  if (isLoading || !session) {
    return <Loading fullScreen />
  }

  const downloadFile = async (format: 'pdf' | 'csv') => {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/export/session/${sessionId}/${format}`,
      {
        headers: authSession?.access_token
          ? { Authorization: `Bearer ${authSession.access_token}` }
          : {},
      },
    )
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-${sessionId}.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Summary: {location.data?.name || 'Inventur'}
          </h1>
          <p className="text-sm text-gray-600">
            Abgeschlossen am {session.completed_at || '-'}
          </p>
        </div>
        <Link to="/inventory">
          <Button variant="secondary">Zurueck</Button>
        </Link>
      </header>

      <Card title="Gesamt">
        <p className="text-sm text-gray-600">
          Items: {session.total_items} · Wert:{' '}
          {Number(session.total_value).toFixed(2)} EUR
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => downloadFile('pdf')}>
            PDF exportieren
          </Button>
          <Button variant="secondary" onClick={() => downloadFile('csv')}>
            CSV exportieren
          </Button>
        </div>
      </Card>

      <Card title="Positionen">
        {items && items.length > 0 ? (
          <div className="space-y-3 text-sm text-gray-700">
            {items.map((item) => {
              const product = productMap.get(item.product_id)
              return (
                <div key={item.id} className="border-b border-gray-100 pb-2">
                  <p className="font-medium">{product?.name || 'Unbekannt'}</p>
                  <p>
                    Menge: {item.quantity} · Differenz:{' '}
                    {item.quantity_difference ?? '-'}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Keine Items gefunden.</p>
        )}
      </Card>
    </div>
  )
}
