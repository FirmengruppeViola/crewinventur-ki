import { Link, useLocation } from 'react-router-dom'
import { Home, MapPin, Package, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'
import { usePrefetch, preloadRouteChunk } from '../../lib/prefetch'
import { useCallback } from 'react'

const navItems = [
  { label: 'Home', to: '/dashboard', icon: Home },
  { label: 'Orte', to: '/locations', icon: MapPin },
  { label: 'Inventur', to: '/inventory', icon: Package },
  { label: 'Preise', to: '/invoices', icon: FileText },
]

export function BottomNav() {
  const location = useLocation()
  const { prefetchDashboard, prefetchLocations, prefetchInventory } = usePrefetch()

  // Get prefetch function for each route
  const getPrefetchFn = useCallback(
    (to: string) => {
      return () => {
        // Preload the JavaScript chunk
        preloadRouteChunk(to)

        // Preload the data
        switch (to) {
          case '/dashboard':
            prefetchDashboard()
            break
          case '/locations':
            prefetchLocations()
            break
          case '/inventory':
            prefetchInventory()
            break
          // Invoices doesn't have a specific prefetch yet
        }
      }
    },
    [prefetchDashboard, prefetchLocations, prefetchInventory]
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-6 pt-4 px-4 safe-area-bottom">
      <nav className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-card/80 p-2 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== '/dashboard' && location.pathname.startsWith(`${item.to}/`))

          const prefetchFn = getPrefetchFn(item.to)

          return (
            <Link
              key={item.to}
              to={item.to}
              onMouseEnter={prefetchFn}
              onTouchStart={prefetchFn}
              className={cn(
                'group relative flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-6 w-6 transition-transform duration-100 group-active:scale-95',
                  isActive && 'fill-primary/20',
                )}
              />
              <span className="text-[10px] font-medium opacity-80">{item.label}</span>

              {isActive && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary shadow-[0_0_12px_2px_rgba(59,130,246,0.6)]" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
