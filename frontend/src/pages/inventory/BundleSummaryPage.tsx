import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { useAuth } from '../../features/auth/useAuth'
import {
  useInventoryBundle,
  useInventoryBundleSessions,
} from '../../features/inventory/useInventory'
import { API_BASE_URL } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

export function BundleSummaryPage() {
  const { id } = useParams()
  const bundleId = id ?? ''
  const { session } = useAuth()
  const addToast = useUiStore((state) => state.addToast)
  const { data: bundle, isLoading } = useInventoryBundle(bundleId)
  const { data: bundleSessions } = useInventoryBundleSessions(bundleId)

  const downloadBundle = async () => {
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

  if (isLoading || !bundle) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{bundle.name}</h1>
          <p className="text-sm text-muted-foreground">
            Sessions: {bundle.total_sessions} · Items: {bundle.total_items}
          </p>
        </div>
        <Link to="/inventory/bundles">
          <Button variant="secondary">Zurück</Button>
        </Link>
      </header>

      <Card title="Gesamt">
        <p className="text-lg font-semibold text-foreground">
          Gesamtwert: <span className="text-emerald-500">{Number(bundle.total_value).toFixed(2)} EUR</span>
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={downloadBundle}>
            PDF exportieren
          </Button>
        </div>
      </Card>

      <Card title="Sessions">
        {bundleSessions && bundleSessions.length > 0 ? (
          <div className="space-y-4">
            {bundleSessions.map((session) => (
              <div key={session.session_id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="font-medium text-foreground">{session.location_name}</p>
                <p className="text-sm text-muted-foreground">
                  Abgeschlossen: {session.completed_at || '-'} · Items: {session.total_items}
                  {' '}· Wert: <span className="text-emerald-500">{Number(session.total_value).toFixed(2)} EUR</span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine Sessions gefunden.</p>
        )}
      </Card>
    </div>
  )
}
