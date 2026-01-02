import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, CheckCircle2, Clock, Package, Archive } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { BottomSheet } from '../../components/ui/BottomSheet'
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
  
  // Modals / Sheets State
  const [isOpen, setIsOpen] = useState(false)
  const [isBundleOpen, setIsBundleOpen] = useState(false)
  const [selectedCompletedSession, setSelectedCompletedSession] = useState<any | null>(null)
  
  // Form State
  const [locationId, setLocationId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [bundleName, setBundleName] = useState('')
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])

  const { data: locations } = useLocations()
  const { data: sessions, isLoading } = useInventorySessions()
  const createSession = useCreateInventorySession()
  const createBundle = useCreateInventoryBundle()

  const locationOptions = [
    { label: 'Location wählen', value: '' },
    ...(locations?.map((location) => ({
      label: location.name,
      value: location.id,
    })) ?? []),
  ]

  const locationMap = useMemo(() => {
    return new Map(locations?.map((location) => [location.id, location]) ?? [])
  }, [locations])

  // Split Sessions
  const activeSessions = sessions?.filter((s) => s.status !== 'completed') ?? []
  const completedSessions = sessions?.filter((s) => s.status === 'completed') ?? []

  const handleCreate = async () => {
    if (!locationId) {
      addToast('Bitte eine Location wählen.', 'error')
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
      addToast('Bitte mindestens eine abgeschlossene Session wählen.', 'error')
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
    <div className="space-y-8 pb-40">
      <header className="px-1 flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventur</h1>
           <p className="text-sm text-muted-foreground">
             Aktuelle Zählungen und Historie.
           </p>
        </div>
        <div className="flex gap-2">
           <Link to="/inventory/bundles">
              <Button variant="outline" size="icon" className="rounded-full h-12 w-12">
                 <Archive className="h-5 w-5" />
              </Button>
           </Link>
           <Button size="icon" className="rounded-full h-12 w-12 shadow-lg shadow-primary/20" onClick={() => setIsOpen(true)}>
             <Plus className="h-6 w-6" />
           </Button>
        </div>
      </header>

      {/* Active Sessions Section */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> Aktiv
        </h2>
        {activeSessions.length > 0 ? (
          <div className="grid gap-3">
            {activeSessions.map((session) => (
              <Link key={session.id} to={`/inventory/sessions/${session.id}`}>
                <Card className="group relative overflow-hidden border-l-4 border-l-primary p-4 hover:bg-accent/50 transition-all">
                  <div className="flex items-center justify-between">
                     <div>
                        <h3 className="font-bold text-foreground text-lg">{session.name || 'Laufende Inventur'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                           {locationMap.get(session.location_id)?.name || 'Unbekannte Location'}
                        </p>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                           {session.total_items} Items
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                     </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Keine aktiven Zählungen.</p>
          </div>
        )}
      </section>

      {/* Completed Sessions Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
           <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
             <CheckCircle2 className="h-4 w-4" /> Abgeschlossen
           </h2>
           <Button variant="ghost" size="sm" onClick={() => setIsBundleOpen(true)}>
             Bundle erstellen
           </Button>
        </div>
        
        {completedSessions.length > 0 ? (
          <div className="space-y-4">
            {completedSessions.map((session) => (
               <Card 
                 key={session.id} 
                 onClick={() => setSelectedCompletedSession(session)}
                 className="flex cursor-pointer items-center justify-between p-3 hover:bg-accent/50 active:scale-[0.99]"
               >
                 <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
                       <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                       <p className="font-medium text-foreground">{session.name || 'Abgeschlossen'}</p>
                       <p className="text-xs text-muted-foreground">
                          {new Date(session.completed_at || Date.now()).toLocaleDateString()} · {session.total_items} Items
                       </p>
                    </div>
                 </div>
                 <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
               </Card>
            ))}
          </div>
        ) : (
           <EmptyState
            title="Keine Historie"
            description="Sobald du eine Session abschließt, erscheint sie hier."
            action={null}
          />
        )}
      </section>

      {/* New Session Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Neue Inventur starten">
        <div className="space-y-4">
          <Select
            label="Welche Location?"
            name="locationId"
            options={locationOptions}
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          />
          <Input
            label="Bezeichnung (Optional)"
            placeholder="z.B. Monatsinventur Januar"
            name="sessionName"
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
          />
          <Button onClick={handleCreate} loading={createSession.isPending} className="w-full h-12 text-lg">
            Inventur starten
          </Button>
        </div>
      </Modal>

      {/* Create Bundle Modal */}
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
          <p className="text-sm text-muted-foreground">
            Fasse mehrere Inventuren zusammen (z.B. Bar + Küche), um einen Gesamtexport zu erhalten.
          </p>
          <Input
            label="Name des Bundles"
            placeholder="z.B. Gesamtbestand Q1"
            name="bundleName"
            value={bundleName}
            onChange={(event) => setBundleName(event.target.value)}
          />
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border rounded-xl p-2 border-border/50">
            {completedSessions.map((session) => {
                const locationName = locationMap.get(session.location_id)?.name || 'Location'
                const title = session.name ? `${session.name} (${locationName})` : locationName
                return (
                  <label
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
                      checked={selectedSessionIds.includes(session.id)}
                      onChange={() => toggleSession(session.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.total_items} Items · {new Date(session.completed_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                  </label>
                )
            })}
             {completedSessions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Keine Sessions verfügbar.</p>
             )}
          </div>
          <Button
            onClick={handleCreateBundle}
            loading={createBundle.isPending}
            disabled={!bundleName.trim() || selectedSessionIds.length === 0}
            className="w-full"
          >
            Bundle erstellen
          </Button>
        </div>
      </Modal>

      {/* Completed Session Details Sheet */}
      <BottomSheet 
         isOpen={!!selectedCompletedSession} 
         onClose={() => setSelectedCompletedSession(null)}
      >
         <div className="space-y-6 pb-6">
            <header className="border-b border-border pb-4">
               <h2 className="text-xl font-bold text-foreground">{selectedCompletedSession?.name || 'Inventur'}</h2>
               <p className="text-sm text-muted-foreground">
                  Abgeschlossen am {selectedCompletedSession?.completed_at ? new Date(selectedCompletedSession.completed_at).toLocaleDateString() : '-'}
               </p>
            </header>

            <div className="grid grid-cols-2 gap-4">
               <div className="rounded-xl bg-accent/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedCompletedSession?.total_items}</p>
                  <p className="text-xs text-muted-foreground">Gezählte Artikel</p>
               </div>
               <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-500">
                     {Number(selectedCompletedSession?.total_value || 0).toFixed(2)} €
                  </p>
                  <p className="text-xs text-emerald-600/70">Gesamtwert</p>
               </div>
            </div>

            <Link to={`/inventory/sessions/${selectedCompletedSession?.id}/summary`}>
               <Button className="w-full h-12">
                  <Package className="mr-2 h-5 w-5" /> Vollständigen Bericht öffnen
               </Button>
            </Link>
         </div>
      </BottomSheet>
    </div>
  )
}