import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DetailPageSkeleton } from '../../components/ui/Skeleton'
import { useInvoice, useInvoiceItems, useProcessInvoice } from '../../features/invoices/useInvoices'
import { useUiStore } from '../../stores/uiStore'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const invoiceId = id ?? ''
  const addToast = useUiStore((state) => state.addToast)

  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const { data: items } = useInvoiceItems(invoiceId)
  const processInvoice = useProcessInvoice(invoiceId)

  const handleProcess = async () => {
    try {
      await processInvoice.mutateAsync()
      addToast('Rechnung verarbeitet.', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Verarbeitung fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isLoading || !invoice) {
    return <DetailPageSkeleton />
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {invoice.supplier_name || 'Rechnung'}
          </h1>
          <p className="text-sm text-gray-600">
            Status: {invoice.status} · Items: {invoice.item_count}
          </p>
        </div>
        <Link to="/invoices">
          <Button variant="secondary">Zurueck</Button>
        </Link>
      </header>

      <Card title="Details">
        <p className="text-sm text-gray-600">Nummer: {invoice.invoice_number || '-'}</p>
        <p className="text-sm text-gray-600">Datum: {invoice.invoice_date || '-'}</p>
        <p className="text-sm text-gray-600">
          Gesamt:{' '}
          {invoice.total_amount !== null && invoice.total_amount !== undefined
            ? Number(invoice.total_amount).toFixed(2)
            : '-'}{' '}
          EUR
        </p>
        {invoice.processing_error ? (
          <p className="mt-2 text-sm text-red-600">{invoice.processing_error}</p>
        ) : null}
      </Card>

      <Card title="Positionen">
        {items && items.length > 0 ? (
          <div className="space-y-2 text-sm text-gray-700">
            {items.map((item) => (
              <div key={item.id} className="border-b border-gray-100 pb-2">
                <p className="font-medium">{item.product_name}</p>
                <p>
                  Menge: {item.quantity ?? '-'} · Preis:{' '}
                  {Number(item.unit_price).toFixed(2)} EUR
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Keine Items gefunden.</p>
        )}
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleProcess} loading={processInvoice.isPending}>
          Verarbeitung starten
        </Button>
        <Link to={`/invoices/${invoiceId}/match`}>
          <Button variant="secondary">Matching</Button>
        </Link>
      </div>
    </div>
  )
}
