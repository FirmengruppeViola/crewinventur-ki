import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, ChevronRight, CheckCircle2, Clock, Package, Archive, Sparkles, Camera, Edit3, FileText, TrendingUp } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { OnboardingSlides, type OnboardingSlide } from '../../components/ui/OnboardingSlides'
import { useOnboarding } from '../../hooks/useOnboarding'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import { useLocations } from '../../features/locations/useLocations'
import {
  useCreateInventoryBundle,
  useCreateInventorySession,
  useInventorySessions,
  type InventorySession,
} from '../../features/inventory/useInventory'
import { useUiStore } from '../../stores/uiStore'

const inventoryOnboardingSlides: OnboardingSlide[] = [
  {
    icon: Sparkles,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/20',
    title: 'Willkommen zur Inventur',
    subtitle: 'Mit KI-Unterstützung erfasst du deinen Bestand in Minuten statt Stunden.',
    highlight: 'Einfach. Schnell. Genau.',
    animation: 'animate-float',
  },
  {
    icon: Camera,
    iconColor: 'text-success',
    iconBg: 'bg-success/20',
    title: 'Foto aufnehmen',
    subtitle: 'Fotografiere dein Regal – die KI erkennt automatisch alle Produkte.',
    highlight: 'Keine manuelle Eingabe nötig',
    animation: 'animate-pulse-slow',
  },
  {
    icon: Edit3,
    iconColor: 'text-warning',
    iconBg: 'bg-warning/20',
    title: 'Menge eingeben',
    subtitle: 'Tippe einfach die Anzahl ein. Fertig!',
    highlight: 'Ein Produkt = Ein Klick',
    animation: 'animate-bounce-slow',
  },
  {
    icon: FileText,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/20',
    title: 'Export & Fertig',
    subtitle: 'Generiere einen PDF-Bericht für deinen Steuerberater mit einem Klick.',
    highlight: 'Inventurwert sofort berechnet',
    animation: 'animate-float',
  },
]

export function InventoryPage() {
  const navigate = useViewNavigate()
  const routeLocation = useLocation()
  const addToast = useUiStore((state) => state.addToast)
  
  const { shouldShow: showOnboarding, markAsSeen: markOnboardingSeen } = useOnboarding('inventory-intro')
  
  const [isOpen, setIsOpen] = useState(false)
  const [isBundleOpen, setIsBundleOpen] = useState(false)
  const [selectedCompletedSession, setSelectedCompletedSession] = useState<InventorySession | null>(null)
  
  const [locationId, setLocationId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [bundleName, setBundleName] = useState('')
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  
  const openCreate = Boolean(
    (routeLocation.state as { openCreate?: boolean } | null)?.openCreate
  )
  
  const { data: locations } = useLocations()
  const { data: sessions } = useInventorySessions()
  const createSession = useCreateInventorySession()
  const createBundle = useCreateInventoryBundle()
  
  const locationOptions = [
    { label: 'Location wählen', value: '' },
    ...(locations?.map((location) => ({ label: location.name, value: location.id })) ?? []),
  ]
  
  const locationMap = useMemo(() => {
    return new Map(locations?.map((location) => [location.id, location]) ?? [])
  }, [locations])
  
  const sessionsList = sessions ?? []
  const activeSessions = sessionsList.filter((s) => s.status !== 'completed')
  const completedSessions = sessionsList.filter((s) => s.status === 'completed')
  
  useEffect(() => {
    if (!openCreate) return
    setIsOpen(true)
    navigate(routeLocation.pathname, { replace: true, state: {} })
  }, [navigate, openCreate, routeLocation.pathname])
  
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
           <Link viewTransition to="/inventory/bundles">
              <Button variant="outline" size="icon" className="rounded-full h-12 w-12 hover:scale-105 transition-transform">
                 <Archive className="h-5 w-5" />
              </Button>
           </Link>
           <Button size="icon" className="rounded-full h-12 w-12 shadow-glow hover:scale-105 active:scale-95 transition-all" onClick={() => setIsOpen(true)}>
             <Plus className="h-6 w-6" />
           </Button>
        </div>
      </header>
      
      <section className="space-y-4">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> Aktiv
        </h2>
        {activeSessions.length > 0 ? (
          <div className="grid gap-4">
            {activeSessions.map((session) => (
              <Link 
                viewTransition 
                key={session.id} 
                to={`/inventory/sessions/${session.id}`}
              >
                <Card 
                  variant="elevated" 
                  hoverable
                  className="group relative overflow-hidden border-l-4 border-l-primary p-4"
                >
                  <div className="flex items-center justify-between">
                     <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:scale-110 transition-transform">
                           <Package className="h-5 w-5" />
                        </div>
                        <div>
                           <h3
                                className="font-bold text-foreground text-lg"
                                style={{ viewTransitionName: `inventory-session-${session.id}` }}
                             >
                             {session.name || 'Laufende Inventur'}
                           </h3>
                           <p className="text-sm text-muted-foreground mt-1">
                              {locationMap.get(session.location_id)?.name || 'Unbekannte Location'}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                           {session.total_items} Items
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                     </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Keine aktiven Zählungen.</p>
          </div>
        )}
      </section>
      
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
             <CheckCircle2 className="h-4 w-4" /> Abgeschlossen
           </h2>
           <Button variant="ghost" size="sm" onClick={() => setIsBundleOpen(true)} className="hover:bg-primary/10">
             Bundle erstellen
           </Button>
        </div>
         
        {completedSessions.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-2 backdrop-blur-sm">
            <div className="space-y-2">
              {completedSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedCompletedSession(session)}
                  className="group flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all hover:bg-primary/5 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-success/10 p-2 text-success group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{session.name || 'Abgeschlossen'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.completed_at || Date.now()).toLocaleDateString()} · {session.total_items} Items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
           <EmptyState
             title="Keine Historie"
             description="Sobald du eine Session abschließt, erscheint sie hier."
             action={null}
           />
        )}
      </section>
      
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Neue Inventur starten">
        <div className="space-y-5">
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
          <Button onClick={handleCreate} loading={createSession.isPending} className="w-full h-12 text-lg shadow-glow">
            Inventur starten
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
        <div className="space-y-5">
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
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin border rounded-xl p-3 border-border/50 bg-secondary/30">
            {completedSessions.map((session) => {
                const locationName = locationMap.get(session.location_id)?.name || 'Location'
                const title = session.name ? `${session.name} (${locationName})` : locationName
                return (
                  <label
                    key={session.id}
                    className="group flex items-center gap-3 rounded-lg p-2.5 hover:bg-primary/10 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary/20"
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
               <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedCompletedSession?.total_items}</p>
                  <p className="text-xs text-muted-foreground">Gezählte Artikel</p>
               </div>
               <div className="rounded-2xl bg-success/10 border border-success/20 p-5 text-center">
                  <p className="text-2xl font-bold text-success">
                     {Number(selectedCompletedSession?.total_value || 0).toFixed(2)} €
                  </p>
                  <p className="text-xs text-success/70">Gesamtwert</p>
               </div>
            </div>
 
            <Link viewTransition to={`/inventory/sessions/${selectedCompletedSession?.id}/summary`}>
               <Button className="w-full h-12 shadow-glow">
                  <Package className="mr-2 h-5 w-5" /> Vollständigen Bericht öffnen
               </Button>
            </Link>
         </div>
      </BottomSheet>
      
      {showOnboarding && (
        <OnboardingSlides
          slides={inventoryOnboardingSlides}
          onComplete={(dontShowAgain) => markOnboardingSeen(dontShowAgain)}
        />
      )}
    </div>
  )
}
