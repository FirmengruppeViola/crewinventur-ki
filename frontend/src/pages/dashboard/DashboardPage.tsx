import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Package, Play, History, TrendingUp } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { useLocations } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import { useInventorySessions, type InventorySession } from '../../features/inventory/useInventory'

export function DashboardPage() {
  const { data: locations, isLoading: locationsLoading } = useLocations()
  const { data: products, isLoading: productsLoading } = useProducts()
  const { data: sessions, isLoading: sessionsLoading } = useInventorySessions()

  const isLoading = productsLoading || locationsLoading || sessionsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-shimmer rounded-xl bg-muted" />
        <div className="h-4 w-64 animate-shimmer rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2">
          <div className="col-span-2 row-span-2 h-48 animate-shimmer rounded-3xl bg-muted" />
          <div className="h-32 animate-shimmer rounded-2xl bg-muted" />
          <div className="h-32 animate-shimmer rounded-2xl bg-muted" />
          <div className="col-span-2 h-32 animate-shimmer rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex flex-col gap-1 px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Übersicht</h1>
        <p className="text-muted-foreground">
          Alles im grünen Bereich. Was steht heute an?
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2">
        {/* Hero Card - Start Inventory */}
        <Link 
          to="/inventory" 
          className="group col-span-2 row-span-2 relative overflow-hidden rounded-3xl gradient-primary p-6 text-white shadow-2xl shadow-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/40 active:scale-95"
        >
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="rounded-2xl bg-white/20 p-4 w-fit backdrop-blur-md group-hover:scale-110 transition-transform">
              <Play className="h-8 w-8 fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Inventur starten</h2>
              <p className="mt-2 text-white/90 opacity-90">Neue Erfassung beginnen</p>
            </div>
          </div>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform group-hover:scale-125 animate-float" />
          <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl animate-float-delayed" />
        </Link>

        {/* Locations Stat - Clickable */}
        <Link to="/locations" className="col-span-1 group">
          <Card className="h-full flex flex-col justify-between p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer glass-card">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-success/10 p-2.5 text-success group-hover:scale-110 transition-transform">
                <MapPin className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{locations?.length ?? 0}</p>
              <p className="text-xs font-medium text-muted-foreground">Standorte</p>
            </div>
          </Card>
        </Link>

        {/* Products Stat - Clickable */}
        <Link to="/products" className="col-span-1 group">
          <Card className="h-full flex flex-col justify-between p-5 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer glass-card">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-warning/10 p-2.5 text-warning group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{products?.length ?? 0}</p>
              <p className="text-xs font-medium text-muted-foreground">Produkte</p>
            </div>
          </Card>
        </Link>

        {/* Recent Activity / Sessions */}
        <Card className="col-span-2 flex flex-col justify-between p-5 hover:border-primary/30 transition-all hover:-translate-y-0.5 glass-card">
          <div className="flex items-center gap-3 mb-4">
             <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <History className="h-5 w-5" />
            </div>
            <span className="font-semibold">Letzte Aktivitäten</span>
          </div>
          
          <div className="space-y-3">
             {sessions && sessions.length > 0 ? (
               sessions.slice(0, 2).map((session: InventorySession) => (
                 <div key={session.id} className="flex items-center justify-between text-sm p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                    <span className="text-muted-foreground">Session #{session.id.slice(0,4)}</span>
                    <span className="font-medium text-success">Abgeschlossen</span>
                 </div>
               ))
             ) : (
               <p className="text-sm text-muted-foreground">Keine kürzlichen Aktivitäten.</p>
             )}
          </div>
          
          <Link to="/inventory/sessions" className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary hover:underline group">
            Alle anzeigen <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Card>
      </div>

    </div>
  )
}
