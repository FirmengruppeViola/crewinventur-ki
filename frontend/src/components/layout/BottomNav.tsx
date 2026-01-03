import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Camera, FileText, Home, MapPin, Package } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { usePrefetch, preloadRouteChunk } from '../../lib/prefetch'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Loading } from '../ui/Loading'
import { useInventorySessions } from '../../features/inventory/useInventory'

const navLeftItems = [
  { label: 'Home', to: '/dashboard', icon: Home },
  { label: 'Orte', to: '/locations', icon: MapPin },
]

const navRightItems = [
  { label: 'Inventur', to: '/inventory', icon: Package },
  { label: 'Preise', to: '/invoices', icon: FileText },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { prefetchDashboard, prefetchLocations, prefetchInventory } = usePrefetch()
  const { data: sessions, isLoading: loadingSessions } = useInventorySessions()
  const [showScanSheet, setShowScanSheet] = useState(false)

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

  const activeSessions = sessions?.filter((session) => session.status !== 'completed') ?? []
  const primarySession = activeSessions[0]

  const handleOpenCreate = useCallback(() => {
    navigate('/inventory', { state: { openCreate: true } })
  }, [navigate])

  const handleScanClick = () => {
    if (!loadingSessions && activeSessions.length === 0) {
      handleOpenCreate()
      return
    }
    setShowScanSheet(true)
  }

  useEffect(() => {
    if (!showScanSheet) return
    if (!loadingSessions && activeSessions.length === 0) {
      setShowScanSheet(false)
      handleOpenCreate()
    }
  }, [activeSessions.length, handleOpenCreate, loadingSessions, showScanSheet])

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-6 pt-4 px-4 safe-area-bottom">
        <nav className="pointer-events-auto relative flex items-end gap-3 rounded-2xl border border-white/10 bg-card/80 px-3 py-2 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 overflow-visible">
          <div className="flex items-center gap-1">
            {navLeftItems.map((item) => {
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
                      'h-6 w-6 transition-transform duration-100 group-active:scale--95',
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
          </div>

          <div className="flex flex-col items-center gap-1 -mt-6">
            <button
              type="button"
              onClick={handleScanClick}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95"
              aria-label="Scannen"
            >
              <Camera className="h-6 w-6" />
            </button>
            <span className="text-[10px] font-medium text-primary">Scan</span>
          </div>

          <div className="flex items-center gap-1">
            {navRightItems.map((item) => {
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
                      'h-6 w-6 transition-transform duration-100 group-active:scale--95',
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
          </div>
        </nav>
      </div>

      <BottomSheet isOpen={showScanSheet} onClose={() => setShowScanSheet(false)} placement="center">
        {loadingSessions ? (
          <div className="flex items-center justify-center py-10">
            <Loading />
          </div>
        ) : (
          <div className="space-y-5 pb-2">
            <div>
              <h2 className="text-xl font-bold">Scannen</h2>
              <p className="text-sm text-muted-foreground">
                {primarySession ? 'Laufende Inventur gefunden.' : 'Keine laufende Inventur.'}
              </p>
            </div>

            {primarySession ? (
              <>
                <div className="rounded-xl bg-accent/50 p-4">
                  <p className="text-xs text-muted-foreground">Aktive Session</p>
                  <p className="font-semibold text-foreground">
                    {primarySession.name || 'Laufende Inventur'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Button
                    className="w-full h-12"
                    onClick={() => {
                      setShowScanSheet(false)
                      navigate(`/inventory/sessions/${primarySession.id}/scan`)
                    }}
                  >
                    Einzelscan starten
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full h-12"
                    onClick={() => {
                      setShowScanSheet(false)
                      navigate(`/inventory/sessions/${primarySession.id}/shelf-scan`)
                    }}
                  >
                    Regal-Scan starten
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => {
                      setShowScanSheet(false)
                      navigate(`/inventory/sessions/${primarySession.id}`)
                    }}
                  >
                    Session öffnen
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-12"
                    onClick={() => {
                      setShowScanSheet(false)
                      handleOpenCreate()
                    }}
                  >
                    Neue Inventur starten
                  </Button>
                </div>
              </>
            ) : (
              <Button className="w-full h-12" onClick={handleOpenCreate}>
                Neue Inventur starten
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  )
}
