import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Loading } from '../../components/ui/Loading'
import { useLocations } from '../../features/locations/useLocations'
import { useCreateInventorySession, useInventorySessions } from '../../features/inventory/useInventory'
import { useUiStore } from '../../stores/uiStore'

export function InventoryPage() {
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const [isOpen, setIsOpen] = useState(false)
  const [locationId, setLocationId] = useState('')
  const [sessionName, setSessionName] = useState('')

  const { data: locations } = useLocations()
  const { data: sessions, isLoading } = useInventorySessions()
  const createSession = useCreateInventorySession()

  const locationOptions = [
    { label: 'Location waehlen', value: '' },
    ...(locations?.map((location) => ({
      label: location.name,
      value: location.id,
    })) ?? []),
  ]

  const handleCreate = async () => {
    if (!locationId) {
      addToast('Bitte eine Location waehlen.', 'error')
      return
    }
    try {
      const session = await createSession.mutateAsync({
        location_id: locationId,
        name: sessionName.trim() || null,
      })
      setIsOpen(false)
      navigate(`/inventory/sessions/${session.id}`)
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Session erstellen fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Inventur</h1>
        <p className="text-sm text-gray-600">
          Starte neue Sessions oder setze bestehende fort.
        </p>
      </header>

      <div className="grid gap-3">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => {
            const path =
              session.status === 'completed'
                ? `/inventory/sessions/${session.id}/summary`
                : `/inventory/sessions/${session.id}`
            return (
              <Link key={session.id} to={path}>
                <Card title={session.name || 'Inventur-Session'}>
                  <p className="text-sm text-gray-600">
                    Status: {session.status} · Items: {session.total_items}
                  </p>
                </Card>
              </Link>
            )
          })
        ) : (
          <EmptyState
            title="Noch keine Sessions"
            description="Starte deine erste Inventur."
            action={
              <Button onClick={() => setIsOpen(true)}>
                Session starten
              </Button>
            }
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
        aria-label="Neue Session"
      >
        <Plus className="h-5 w-5" />
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Neue Session">
        <div className="space-y-4">
          <Select
            label="Location"
            name="locationId"
            options={locationOptions}
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          />
          <Input
            label="Name (optional)"
            name="sessionName"
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
          />
          <Button onClick={handleCreate} loading={createSession.isPending}>
            Session starten
          </Button>
        </div>
      </Modal>
    </div>
  )
}
