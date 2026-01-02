import { Link } from 'react-router-dom'
import { Plus, MapPin, ChevronRight } from 'lucide-react'
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
      <div className="p-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Locations laden fehlgeschlagen.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Verwalte deine Standorte für die Inventur.
        </p>
      </header>

      {data && data.length > 0 ? (
        <div className="grid gap-3">
          {data.map((location) => (
            <Link key={location.id} to={`/locations/${location.id}`}>
              <Card className="group relative overflow-hidden transition-all hover:bg-accent/50 active:scale-[0.99]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="truncate font-semibold text-foreground">{location.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {location.description || 'Keine Beschreibung'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Noch keine Locations"
          description="Lege deinen ersten Standort an, um Inventuren zu starten."
          action={
            <Link to="/locations/new" className="text-primary hover:underline">
              Standort erstellen
            </Link>
          }
        />
      )}

      <Link
        to="/locations/new"
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Neue Location"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}
