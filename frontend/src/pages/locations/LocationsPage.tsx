import { useState } from 'react'
import { Plus, MapPin, ChevronRight, Trash2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { useLocations, useDeleteLocation, useUpdateLocation, useCreateLocation } from '../../features/locations/useLocations'
import { useUiStore } from '../../stores/uiStore'
import { useDelayedFlag } from '../../hooks/useDelayedFlag'

export function LocationsPage() {
  const { data, isLoading, error } = useLocations()
  const addToast = useUiStore((state) => state.addToast)
  const showSkeleton = useDelayedFlag(isLoading && !data)
  
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
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      addToast(`Speichern fehlgeschlagen: ${message}`, 'error')
      console.error('Save location error:', err)
    }
  }

  const handleDelete = async () => {
    if (!selectedLocationId) return
    try {
      await deleteLocation.mutateAsync()
      addToast('Location gelöscht.', 'success')
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      addToast(`Löschen fehlgeschlagen: ${message}`, 'error')
      console.error('Delete location error:', err)
    }
  }

  const handleClose = () => {
    setSelectedLocationId(null)
    setIsCreating(false)
    setIsEditMode(false)
  }

  const handleCancelEdit = () => {
    if (isCreating) {
      handleClose()
      return
    }

    if (selectedLocation) {
      setFormData({
        name: selectedLocation.name,
        description: selectedLocation.description || '',
      })
    }

    setIsEditMode(false)
  }

  // Skeleton component for loading state
  const LocationSkeleton = () => (
    <div className="grid gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="h-12 w-12 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-8 pb-40">
      <header className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Deine Standorte im Überblick.
          </p>
        </div>
        <Button size="icon" className="rounded-full h-12 w-12 shadow-lg shadow-primary/20" onClick={handleOpenCreate}>
          <Plus className="h-6 w-6" />
        </Button>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Fehler beim Laden</p>
          <p className="mt-1 text-xs opacity-80">
            {error instanceof Error ? error.message : 'Unbekannter Fehler'}
          </p>
        </div>
      ) : null}

      {showSkeleton ? <LocationSkeleton /> : null}

      {!isLoading && data && data.length > 0 && (
        <div className="grid gap-4">
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
                <h3
                  className="truncate font-semibold text-foreground"
                  style={{ viewTransitionName: `location-name-${location.id}` }}
                >
                  {location.name}
                </h3>
                <p className="truncate text-sm text-muted-foreground">
                  {location.description || 'Keine Beschreibung'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <EmptyState
          title="Keine Locations"
          description="Erstelle hier deinen ersten Standort."
          action={
            <Button onClick={handleOpenCreate}>Erstellen</Button>
          }
        />
      )}

      {/* Detail/Edit Sheet */}
      <BottomSheet isOpen={isSheetOpen} onClose={handleClose} placement="center">
        <div className="space-y-6 pb-6">
          <header className="border-b border-border pb-4">
             <div>
                <h2 className="text-xl font-bold text-foreground">
                  {isCreating ? 'Neue Location' : selectedLocation?.name}
                </h2>
                {!isCreating && !isEditMode && (
                  <p className="text-xs text-muted-foreground">Status: Aktiv</p>
                )}
             </div>
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
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={handleCancelEdit}>
                    Abbrechen
                  </Button>
                  <Button className="flex-1" onClick={handleSave}>Speichern</Button>
                </div>
                {!isCreating && (
                  <Button variant="danger" className="w-full" onClick={handleDelete}>
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
