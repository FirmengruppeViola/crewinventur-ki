import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { Select } from '../../components/ui/Select'
import { useInvoiceItems, useMatchInvoiceItem } from '../../features/invoices/useInvoices'
import { useProducts } from '../../features/products/useProducts'
import { useUiStore } from '../../stores/uiStore'

type MatchRowProps = {
  invoiceId: string
  itemId: string
  productName: string
  defaultMatch: string | null
  options: { label: string; value: string }[]
}

function MatchRow({ invoiceId, itemId, productName, defaultMatch, options }: MatchRowProps) {
  const [selected, setSelected] = useState(defaultMatch ?? '')
  const addToast = useUiStore((state) => state.addToast)
  const matchItem = useMatchInvoiceItem(invoiceId, itemId)

  const handleMatch = async () => {
    if (!selected) return
    try {
      await matchItem.mutateAsync(selected)
      addToast('Match gespeichert.', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Match fehlgeschlagen.',
        'error',
      )
    }
  }

  return (
    <div className="space-y-2 border-b border-gray-100 pb-3">
      <p className="text-sm font-medium text-gray-900">{productName}</p>
      <Select
        options={[{ label: 'Produkt waehlen', value: '' }, ...options]}
        name={`match-${itemId}`}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
      />
      <Button size="sm" onClick={handleMatch} loading={matchItem.isPending}>
        Match speichern
      </Button>
    </div>
  )
}

export function InvoiceMatchingPage() {
  const { id } = useParams()
  const invoiceId = id ?? ''
  const { data: items, isLoading } = useInvoiceItems(invoiceId)
  const { data: products } = useProducts()

  const options = useMemo(() => {
    return (
      products?.map((product) => ({
        label: product.name,
        value: product.id,
      })) ?? []
    )
  }, [products])

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matching</h1>
          <p className="text-sm text-gray-600">
            Ordne Rechnungspositionen den Produkten zu.
          </p>
        </div>
        <Link to={`/invoices/${invoiceId}`}>
          <Button variant="secondary">Zurueck</Button>
        </Link>
      </header>

      <Card title="Offene Positionen">
        {items && items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => (
              <MatchRow
                key={item.id}
                invoiceId={invoiceId}
                itemId={item.id}
                productName={item.product_name}
                defaultMatch={item.matched_product_id}
                options={options}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Keine Positionen gefunden.</p>
        )}
      </Card>
    </div>
  )
}
