import { Link, useLocation } from 'react-router-dom'
import { Camera, Clock, FileText, Grid3X3, Home, MapPin, Package, Play, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { usePrefetch, preloadRouteChunk } from '../../lib/prefetch'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Loading } from '../ui/Loading'
import { useInventorySessions } from '../../features/inventory/useInventory'
import { useViewNavigate } from '../../hooks/useViewNavigate'

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
  const navigate = useViewNavigate()
  const { prefetchDashboard, prefetchLocations, prefetchInventory } = usePrefetch()
  const { data: sessions, isLoading: loadingSessions } = useInventorySessions()
  const [showScanSheet, setShowScanSheet] = useState(false)

  const getPrefetchFn = useCallback(
    (to: string) => {
      return () => {
        preloadRouteChunk(to)

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
        }
      }
    },
    [prefetchDashboard, prefetchLocations, prefetchInventory]
  )

  const activeSessions = sessions?.filter((session) => session.status !== 'completed') ?? []
  const sessionCount = activeSessions.length

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
        <nav className="pointer-events-auto relative flex items-end gap-2 rounded-full glass-heavy border border-border/50 px-2 py-2 shadow-2xl shadow-primary/10">
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
                    'group relative flex min-w-[64px] flex-col items-center gap-1 rounded-full px-4 py-2 transition-all duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 transition-all duration-200',
                      isActive && 'scale-110 fill-primary/20',
                      !isActive && 'group-hover:scale-105',
                    )}
                  />
                  <span className="text-[10px] font-medium opacity-90 transition-opacity">
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="absolute -bottom-1 h-1 w-4 rounded-full bg-primary shadow-glow animate-pulse-slow" />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex flex-col items-center gap-0.5 -mt-4">
            <button
              type="button"
              onClick={handleScanClick}
              className="gradient-primary flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95"
              aria-label="Scannen"
            >
              <Camera className="h-6 w-6" />
            </button>
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
                    'group relative flex min-w-[64px] flex-col items-center gap-1 rounded-full px-4 py-2 transition-all duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 transition-all duration-200',
                      isActive && 'scale-110 fill-primary/20',
                      !isActive && 'group-hover:scale-105',
                    )}
                  />
                  <span className="text-[10px] font-medium opacity-90 transition-opacity">
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="absolute -bottom-1 h-1 w-4 rounded-full bg-primary shadow-glow animate-pulse-slow" />
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
          <div className="space-y-6 pb-2">
            <div>
              <h2 className="text-2xl font-semibold">Scannen</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Laufende Inventur fortsetzen oder eine neue starten.
              </p>
            </div>

            {sessionCount > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Laufende Inventur
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {sessionCount} aktiv
                  </span>
                </div>

                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {session.name || 'Laufende Inventur'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Aktiv · {session.total_items} Items
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setShowScanSheet(false)
                            navigate(`/inventory/sessions/${session.id}`)
                          }}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Fortsetzen
                        </Button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => {
                            setShowScanSheet(false)
                            navigate(`/inventory/sessions/${session.id}/scan`)
                          }}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Einzelscan
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => {
                            setShowScanSheet(false)
                            navigate(`/inventory/sessions/${session.id}/shelf-scan`)
                          }}
                        >
                          <Grid3X3 className="mr-2 h-4 w-4" />
                          Regal-Scan
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Neue Inventur
              </p>
              <div className="rounded-2xl border border-dashed border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      Neue Inventur starten
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Erstellt eine neue Session.
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 h-12 w-full"
                  onClick={() => {
                    setShowScanSheet(false)
                    handleOpenCreate()
                  }}
                >
                  Neue Inventur
                </Button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
