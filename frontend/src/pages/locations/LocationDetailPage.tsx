import { Link, useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DetailPageSkeleton } from '../../components/ui/Skeleton'
import { useDeleteLocation, useLocation } from '../../features/locations/useLocations'
import { useUiStore } from '../../stores/uiStore'

export function LocationDetailPage() {
  const { id } = useParams()
  const navigate = useViewNavigate()
  const addToast = useUiStore((state) => state.addToast)

  const { data, isLoading, error } = useLocation(id)
  const deleteLocation = useDeleteLocation(id ?? '')

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteLocation.mutateAsync()
      addToast('Location geloescht.', 'success')
      navigate('/locations')
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Loeschen fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isLoading) {
    return <DetailPageSkeleton />
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Location laden fehlgeschlagen.'}
        </p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-gray-600">Location nicht gefunden.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ viewTransitionName: `location-name-${data.id}` }}
          >
            {data.name}
          </h1>
          <p className="text-sm text-gray-600">{data.description || 'Keine Beschreibung'}</p>
        </div>
        <Link viewTransition to="/locations">
          <Button variant="secondary">Zurueck</Button>
        </Link>
      </header>

      <Card title="Details">
        <p className="text-sm text-gray-600">Status: {data.is_active ? 'Aktiv' : 'Inaktiv'}</p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link viewTransition to={`/locations/${data.id}/edit`}>
          <Button>Bearbeiten</Button>
        </Link>
        <Button
          variant="danger"
          onClick={handleDelete}
          loading={deleteLocation.isPending}
        >
          Loeschen
        </Button>
      </div>
    </div>
  )
}

