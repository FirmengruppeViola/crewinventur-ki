import { useMemo, useState } from 'react'
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
import {
  useCreateInventoryBundle,
  useCreateInventorySession,
  useInventorySessions,
} from '../../features/inventory/useInventory'
import { useUiStore } from '../../stores/uiStore'

export function InventoryPage() {
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const [isOpen, setIsOpen] = useState(false)
  const [locationId, setLocationId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [isBundleOpen, setIsBundleOpen] = useState(false)
  const [bundleName, setBundleName] = useState('')
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])

  const { data: locations } = useLocations()
  const { data: sessions, isLoading } = useInventorySessions()
  const createSession = useCreateInventorySession()
  const createBundle = useCreateInventoryBundle()

  const locationOptions = [
    { label: 'Location waehlen', value: '' },
    ...(locations?.map((location) => ({
      label: location.name,
      value: location.id,
    })) ?? []),
  ]

  const locationMap = useMemo(() => {
    return new Map(locations?.map((location) => [location.id, location]) ?? [])
  }, [locations])

  const completedSessions =
    sessions?.filter((session) => session.status === 'completed') ?? []

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

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId],
    )
  }

  const handleCreateBundle = async () => {
    if (!bundleName.trim()) {
      addToast('Bitte einen Namen vergeben.', 'error')
      return
    }
    if (selectedSessionIds.length === 0) {
      addToast('Bitte mindestens eine abgeschlossene Session waehlen.', 'error')
      return
    }

    try {
      await createBundle.mutateAsync({
        name: bundleName.trim(),
        session_ids: selectedSessionIds,
      })
      addToast('Bundle erstellt.', 'success')
      setIsBundleOpen(false)
      setBundleName('')
      setSelectedSessionIds([])
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Bundle erstellen fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventur</h1>
          <p className="text-sm text-muted-foreground">
            Starte neue Sessions oder setze bestehende fort.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/inventory/bundles">
            <Button variant="secondary">Bundles</Button>
          </Link>
          <Button variant="outline" onClick={() => setIsBundleOpen(true)}>
            Bundle erstellen
          </Button>
        </div>
      </header>

      <div className="grid gap-3">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => {
            const path =
              session.status === 'completed'
                ? `/inventory/sessions/${session.id}/summary`
                : `/inventory/sessions/${session.id}`
            const statusColor = session.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'
            
            return (
              <Link key={session.id} to={path}>
                <Card title={session.name || 'Inventur-Session'} className="hover:bg-accent/50 transition-colors">
                  <p className="text-sm text-muted-foreground">
                    Status: <span className={`font-medium capitalize ${statusColor}`}>{session.status}</span> · 
                    Items: <span className="text-foreground">{session.total_items}</span>
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
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 hover:scale-105 transition-all"
        aria-label="Neue Session"
      >
        <Plus className="h-6 w-6" />
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
          <Button onClick={handleCreate} loading={createSession.isPending} className="w-full">
            Session starten
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isBundleOpen}
        onClose={() => {
          setIsBundleOpen(false)
          setBundleName('')
          setSelectedSessionIds([])
        }}
        title="Bundle erstellen"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            name="bundleName"
            value={bundleName}
            onChange={(event) => setBundleName(event.target.value)}
          />
          {completedSessions.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {completedSessions.map((session) => {
                const locationName =
                  locationMap.get(session.location_id)?.name || 'Location'
                const title = session.name
                  ? `${session.name} (${locationName})`
                  : locationName
                return (
                  <label
                    key={session.id}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
                      checked={selectedSessionIds.includes(session.id)}
                      onChange={() => toggleSession(session.id)}
                    />
                    <span className="flex-1">
                      <span className="font-medium text-foreground">{title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Abgeschlossen: {session.completed_at || '-'} · Items: {session.total_items}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keine abgeschlossenen Sessions gefunden.
            </p>
          )}
          <div className="pt-2">
            <Button
                onClick={handleCreateBundle}
                loading={createBundle.isPending}
                disabled={!bundleName.trim() || selectedSessionIds.length === 0}
                className="w-full"
            >
                Bundle erstellen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
