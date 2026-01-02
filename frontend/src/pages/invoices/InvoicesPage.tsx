import { useRef, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Loading } from '../../components/ui/Loading'
import { useInvoices, useUploadInvoice } from '../../features/invoices/useInvoices'
import { useUiStore } from '../../stores/uiStore'

export function InvoicesPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const addToast = useUiStore((state) => state.addToast)
  const { data: invoices, isLoading } = useInvoices()
  const uploadInvoice = useUploadInvoice()

  const handlePickFile = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await uploadInvoice.mutateAsync(file)
      addToast('Rechnung hochgeladen.', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Upload fehlgeschlagen.',
        'error',
      )
    } finally {
      event.target.value = ''
    }
  }

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <p className="text-sm text-gray-600">Lade neue Rechnungen hoch.</p>
        </div>
        <Button variant="secondary" onClick={handlePickFile} loading={uploadInvoice.isPending}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </header>

      {invoices && invoices.length > 0 ? (
        <div className="grid gap-3">
          {invoices.map((invoice) => (
            <Link key={invoice.id} to={`/invoices/${invoice.id}`}>
              <Card title={invoice.supplier_name || invoice.file_name}>
                <p className="text-sm text-gray-600">
                  Status: {invoice.status} · Betrag:{' '}
                  {invoice.total_amount !== null && invoice.total_amount !== undefined
                    ? Number(invoice.total_amount).toFixed(2)
                    : '-'}{' '}
                  EUR
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Noch keine Rechnungen"
          description="Lade die erste Rechnung hoch."
          action={
            <Button onClick={handlePickFile} loading={uploadInvoice.isPending}>
              Datei waehlen
            </Button>
          }
        />
      )}
    </div>
  )
}
