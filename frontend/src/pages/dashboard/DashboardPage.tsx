import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useLocations } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import { useInventorySessions } from '../../features/inventory/useInventory'

export function DashboardPage() {
  const { data: locations } = useLocations()
  const { data: products } = useProducts()
  const { data: sessions } = useInventorySessions()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Willkommen zurueck. Starte eine neue Inventur oder behalte den Status im Blick.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Locations">
          <p className="text-2xl font-semibold text-gray-900">
            {locations?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500">Aktive Standorte</p>
        </Card>
        <Card title="Produkte">
          <p className="text-2xl font-semibold text-gray-900">
            {products?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500">Im Katalog</p>
        </Card>
        <Card title="Sessions">
          <p className="text-2xl font-semibold text-gray-900">
            {sessions?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500">Letzte Inventuren</p>
        </Card>
      </section>

      <Card title="Quick Actions">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/inventory">
            <Button>Neue Inventur starten</Button>
          </Link>
          <Link to="/locations">
            <Button variant="secondary">Locations verwalten</Button>
          </Link>
          <Link to="/invoices">
            <Button variant="secondary">Rechnungen</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
