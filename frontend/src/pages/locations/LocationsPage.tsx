import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Loading } from '../../components/ui/Loading'
import { useLocations } from '../../features/locations/useLocations'

export function LocationsPage() {
  const { data, isLoading, error } = useLocations()

  if (isLoading) {
    return <Loading fullScreen />
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Locations laden fehlgeschlagen.'}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <p className="text-sm text-gray-600">
          Verwalte deine Standorte fuer die Inventur.
        </p>
      </header>

      {data && data.length > 0 ? (
        <div className="grid gap-3">
          {data.map((location) => (
            <Link key={location.id} to={`/locations/${location.id}`}>
              <Card title={location.name}>
                <p className="text-sm text-gray-600">
                  {location.description || 'Keine Beschreibung'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Noch keine Locations"
          description="Lege deinen ersten Standort an."
          action={
            <Link to="/locations/new" className="text-blue-600 hover:underline">
              Standort erstellen
            </Link>
          }
        />
      )}

      <Link
        to="/locations/new"
        className="fixed bottom-24 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
        aria-label="Neue Location"
      >
        <Plus className="h-5 w-5" />
      </Link>
    </div>
  )
}
