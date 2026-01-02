import { useState } from 'react'
import { Plus, MapPin, ChevronRight, Edit2, Trash2, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Loading } from '../../components/ui/Loading'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { useLocations, useDeleteLocation, useUpdateLocation, useCreateLocation } from '../../features/locations/useLocations'
import { useUiStore } from '../../stores/uiStore'

export function LocationsPage() {
  const { data, isLoading, error } = useLocations()
  const addToast = useUiStore((state) => state.addToast)
  
  // State for Sheet
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Derived State
  const selectedLocation = data?.find(l => l.id === selectedLocationId)
  const isSheetOpen = !!selectedLocationId || isCreating

  const deleteLocation = useDeleteLocation(selectedLocationId ?? '')
  const updateLocation = useUpdateLocation(selectedLocationId ?? '')
  const createLocation = useCreateLocation()

  // Form State (Local simplistic form handling for speed)
  const [formData, setFormData] = useState({ name: '', description: '' })

  const handleOpenCreate = () => {
    setFormData({ name: '', description: '' })
    setIsCreating(true)
    setIsEditMode(true)
    setSelectedLocationId(null)
  }

  const handleOpenDetail = (location: any) => {
    setFormData({ name: location.name, description: location.description || '' })
    setSelectedLocationId(location.id)
    setIsCreating(false)
    setIsEditMode(false)
  }

  const handleSave = async () => {
    try {
      if (isCreating) {
        await createLocation.mutateAsync(formData)
        addToast('Location erstellt.', 'success')
      } else if (selectedLocationId) {
        await updateLocation.mutateAsync(formData)
        addToast('Location aktualisiert.', 'success')
      }
      handleClose()
    } catch (err) {
      addToast('Speichern fehlgeschlagen.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selectedLocationId) return
    try {
      await deleteLocation.mutateAsync()
      addToast('Location gelöscht.', 'success')
      handleClose()
    } catch (err) {
      addToast('Löschen fehlgeschlagen.', 'error')
    }
  }

  const handleClose = () => {
    setSelectedLocationId(null)
    setIsCreating(false)
    setIsEditMode(false)
  }

  if (isLoading) return <Loading fullScreen />

  return (
    <div className="space-y-6 pb-24">
      <header className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Deine Standorte im Überblick.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Daten konnten nicht geladen werden.
        </div>
      ) : null}

      {data && data.length > 0 ? (
        <div className="grid gap-3">
          {data.map((location) => (
            <Card 
              key={location.id} 
              onClick={() => handleOpenDetail(location)}
              className="group relative flex cursor-pointer items-center gap-4 overflow-hidden p-4 transition-all hover:bg-accent/50 active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="truncate font-semibold text-foreground">{location.name}</h3>
                <p className="truncate text-sm text-muted-foreground">
                  {location.description || 'Keine Beschreibung'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Keine Locations"
          description="Erstelle hier deinen ersten Standort."
          action={
            <Button onClick={handleOpenCreate}>Erstellen</Button>
          }
        />
      )}

      {/* FAB */}
      <button
        onClick={handleOpenCreate}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(59,130,246,0.4)] hover:bg-primary/90 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-30"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Detail/Edit Sheet */}
      <BottomSheet isOpen={isSheetOpen} onClose={handleClose}>
        <div className="space-y-6 pb-6">
          <header className="flex items-center justify-between border-b border-border pb-4">
             <div>
                <h2 className="text-xl font-bold text-foreground">
                  {isCreating ? 'Neue Location' : selectedLocation?.name}
                </h2>
                {!isCreating && !isEditMode && (
                  <p className="text-xs text-muted-foreground">Status: Aktiv</p>
                )}
             </div>
             {!isCreating && !isEditMode && (
               <Button size="sm" variant="ghost" onClick={() => setIsEditMode(true)}>
                 <Edit2 className="h-4 w-4" />
               </Button>
             )}
              {isEditMode && !isCreating && (
               <Button size="sm" variant="ghost" onClick={() => setIsEditMode(false)}>
                 <X className="h-4 w-4" />
               </Button>
             )}
          </header>

          {isEditMode ? (
            <div className="space-y-4 animate-fade-in">
              <Input 
                label="Name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="z.B. Hauptlager"
              />
              <Textarea 
                label="Beschreibung" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Optionale Notizen..."
              />
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={handleSave}>Speichern</Button>
                {!isCreating && (
                   <Button variant="danger" className="flex-1" onClick={handleDelete}>
                     <Trash2 className="mr-2 h-4 w-4" /> Löschen
                   </Button>
                )}
              </div>
            </div>
          ) : (
             <div className="space-y-6 animate-fade-in">
                <div className="rounded-xl bg-accent/50 p-4">
                   <h3 className="text-sm font-medium text-muted-foreground mb-1">Beschreibung</h3>
                   <p className="text-foreground">{selectedLocation?.description || '-'}</p>
                </div>
                
                {/* Stats / Future Features Placeholders */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="rounded-xl border border-border bg-card p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">-</p>
                      <p className="text-xs text-muted-foreground">Aktive Sessions</p>
                   </div>
                   <div className="rounded-xl border border-border bg-card p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">-</p>
                      <p className="text-xs text-muted-foreground">Produkte</p>
                   </div>
                </div>

                <Button className="w-full" onClick={() => setIsEditMode(true)}>
                  Bearbeiten
                </Button>
             </div>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
