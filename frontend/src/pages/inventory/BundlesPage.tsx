import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../features/auth/useAuth'
import { useInventoryBundles } from '../../features/inventory/useInventory'
import { apiDownload } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

export function BundlesPage() {
  const { session } = useAuth()
  const addToast = useUiStore((state) => state.addToast)
  const { data: bundles, isLoading } = useInventoryBundles()

  const downloadBundle = async (bundleId: string) => {
    try {
      await apiDownload(
        `/api/v1/export/bundle/${bundleId}/pdf`,
        `inventory-bundle-${bundleId}.pdf`,
        session?.access_token,
      )
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Download fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isLoading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bundles</h1>
          <p className="text-sm text-muted-foreground">
            Verwalte deine akkumulierten Inventuren.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link viewTransition to="/inventory">
            <Button variant="secondary">Zurück</Button>
          </Link>
          <Link viewTransition to="/inventory">
            <Button>Neues Bundle erstellen</Button>
          </Link>
        </div>
      </header>

      {bundles && bundles.length > 0 ? (
        <div className="grid gap-4">
          {bundles.map((bundle) => (
            <Card key={bundle.id} title={bundle.name} className="bg-card/50 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">
                Sessions: <span className="text-foreground font-medium">{bundle.total_sessions}</span> · 
                Items: <span className="text-foreground font-medium">{bundle.total_items}</span> · 
                Wert: <span className="text-emerald-500 font-medium">{Number(bundle.total_value).toFixed(2)} EUR</span>
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link viewTransition to={`/inventory/bundles/${bundle.id}`}>
                  <Button variant="secondary" size="sm">Details</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => downloadBundle(bundle.id)}>
                  PDF exportieren
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Noch keine Bundles"
          description="Erstelle dein erstes Bundle aus abgeschlossenen Sessions."
          action={
            <Link viewTransition to="/inventory">
              <Button>Neues Bundle erstellen</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}

