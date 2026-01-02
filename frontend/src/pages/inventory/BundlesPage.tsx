import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Loading } from '../../components/ui/Loading'
import { useAuth } from '../../features/auth/useAuth'
import { useInventoryBundles } from '../../features/inventory/useInventory'
import { API_BASE_URL } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

export function BundlesPage() {
  const { session } = useAuth()
  const addToast = useUiStore((state) => state.addToast)
  const { data: bundles, isLoading } = useInventoryBundles()

  const downloadBundle = async (bundleId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/export/bundle/${bundleId}/pdf`,
      {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      },
    )
    if (!response.ok) {
      addToast('Download fehlgeschlagen.', 'error')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-bundle-${bundleId}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <Loading fullScreen />
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
          <Link to="/inventory">
            <Button variant="secondary">Zurück</Button>
          </Link>
          <Link to="/inventory">
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
                <Link to={`/inventory/bundles/${bundle.id}`}>
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
            <Link to="/inventory">
              <Button>Neues Bundle erstellen</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
