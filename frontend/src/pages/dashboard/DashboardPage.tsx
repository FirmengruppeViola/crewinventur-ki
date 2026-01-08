import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Package, Play, History } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { useLocations } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import { useInventorySessions, type InventorySession } from '../../features/inventory/useInventory'

export function DashboardPage() {
  const { data: locations } = useLocations()
  const { data: products } = useProducts()
  const { data: sessions } = useInventorySessions()

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-1 px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Übersicht</h1>
        <p className="text-muted-foreground">
          Alles im grünen Bereich. Was steht heute an?
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2">
        {/* Hero Card - Start Inventory */}
        <Link viewTransition 
          to="/inventory" 
          className="group col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/80 to-indigo-600 p-6 text-white shadow-2xl transition-transform hover:scale-[1.02] active:scale-95"
        >
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="rounded-2xl bg-white/20 p-3 w-fit backdrop-blur-md">
              <Play className="h-8 w-8 fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Inventur starten</h2>
              <p className="mt-1 text-indigo-100 opacity-90">Neue Erfassung beginnen</p>
            </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-150" />
        </Link>

        {/* Locations Stat - Clickable */}
        <Link viewTransition to="/locations" className="col-span-1">
          <Card className="h-full flex flex-col justify-between p-5 hover:bg-zinc-900/80 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
                <MapPin className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{locations?.length ?? 0}</p>
              <p className="text-xs font-medium text-muted-foreground">Standorte</p>
            </div>
          </Card>
        </Link>

        {/* Products Stat - Clickable */}
        <Link viewTransition to="/products" className="col-span-1">
          <Card className="h-full flex flex-col justify-between p-5 hover:bg-zinc-900/80 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{products?.length ?? 0}</p>
              <p className="text-xs font-medium text-muted-foreground">Produkte</p>
            </div>
          </Card>
        </Link>

        {/* Recent Activity / Sessions */}
        <Card className="col-span-2 flex flex-col justify-between p-5 hover:bg-zinc-900/80 transition-colors">
          <div className="flex items-center gap-3 mb-4">
             <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <History className="h-5 w-5" />
            </div>
            <span className="font-semibold">Letzte Aktivitäten</span>
          </div>
          
          <div className="space-y-3">
             {sessions && sessions.length > 0 ? (
               sessions.slice(0, 2).map((session: InventorySession) => (
                 <div key={session.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Session #{session.id.slice(0,4)}</span>
                    <span className="font-medium text-emerald-500">Abgeschlossen</span>
                 </div>
               ))
             ) : (
               <p className="text-sm text-muted-foreground">Keine kürzlichen Aktivitäten.</p>
             )}
          </div>
          
          <Link viewTransition to="/inventory/sessions" className="mt-4 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Alle anzeigen <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

    </div>
  )
}

