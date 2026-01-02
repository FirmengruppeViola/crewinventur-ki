import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle2, Sparkles, Plus, Wand2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Loading } from '../../components/ui/Loading'
import { Select } from '../../components/ui/Select'
import {
  useInvoiceItems,
  useMatchInvoiceItem,
  useAutoCreateProducts,
  useSmartMatchInvoice,
} from '../../features/invoices/useInvoices'
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
  const [isSaved, setIsSaved] = useState(false)
  const addToast = useUiStore((state) => state.addToast)
  const matchItem = useMatchInvoiceItem(invoiceId, itemId)

  const handleMatch = async () => {
    if (!selected) return
    try {
      await matchItem.mutateAsync(selected)
      addToast('Match gespeichert.', 'success')
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Match fehlgeschlagen.',
        'error',
      )
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20">
      <div className="flex items-start justify-between">
         <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Rechnungsposition</p>
            <p className="text-base font-medium text-foreground mt-1">{productName}</p>
         </div>
         {defaultMatch && !isSaved && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-500 uppercase">Gematcht</span>
         )}
         {isSaved && (
             <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary uppercase animate-fade-in">
                <CheckCircle2 className="h-3 w-3" /> Gespeichert
             </span>
         )}
      </div>
      
      <div className="flex items-end gap-2 mt-2">
        <div className="flex-1">
           <Select
            label="Zuordnung im System"
            options={[{ label: 'Produkt wählen...', value: '' }, ...options]}
            name={`match-${itemId}`}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="bg-background"
          />
        </div>
        <Button 
          size="md" 
          onClick={handleMatch} 
          loading={matchItem.isPending}
          disabled={!selected || selected === defaultMatch}
          className="mb-[1px]" // Align with input
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function InvoiceMatchingPage() {
  const { id } = useParams()
  const invoiceId = id ?? ''
  const addToast = useUiStore((state) => state.addToast)
  const { data: items, isLoading } = useInvoiceItems(invoiceId)
  const { data: products } = useProducts()
  const autoCreate = useAutoCreateProducts(invoiceId)
  const smartMatch = useSmartMatchInvoice(invoiceId)

  const options = useMemo(() => {
    return (
      products?.map((product) => ({
        label: `${product.brand ? product.brand + ' ' : ''}${product.name}`,
        value: product.id,
      })) ?? []
    )
  }, [products])

  // Count unmatched items
  const unmatchedCount = useMemo(() => {
    return items?.filter((item) => !item.matched_product_id).length || 0
  }, [items])

  const handleAutoCreate = async () => {
    try {
      const result = await autoCreate.mutateAsync()
      addToast(
        result.count > 0
          ? `${result.count} Produkte erstellt`
          : 'Keine neuen Produkte erstellt',
        result.count > 0 ? 'success' : 'info'
      )
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Fehler beim Erstellen',
        'error'
      )
    }
  }

  const handleSmartMatch = async () => {
    try {
      const result = await smartMatch.mutateAsync()
      addToast(
        result.matched_count > 0
          ? `${result.matched_count} Zuordnungen gefunden`
          : 'Keine Zuordnungen gefunden',
        result.matched_count > 0 ? 'success' : 'info'
      )
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Smart Match fehlgeschlagen',
        'error'
      )
    }
  }

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="px-1 flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-20 py-4 -mx-4 px-4 border-b border-border">
        <Link to="/invoices">
          <Button variant="ghost" size="icon" className="rounded-full">
             <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Matching</h1>
          <p className="text-xs text-muted-foreground">
            {items?.length || 0} Positionen · {unmatchedCount} offen
          </p>
        </div>
      </header>

      {/* Smart Actions Banner */}
      {unmatchedCount > 0 && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                {unmatchedCount} Produkte nicht zugeordnet
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Nutze KI fuer automatische Zuordnung oder erstelle neue Produkte.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Smart Match - only if products exist */}
                {products && products.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleSmartMatch}
                    loading={smartMatch.isPending}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    KI-Zuordnung
                  </Button>
                )}
                <Button
                  onClick={handleAutoCreate}
                  loading={autoCreate.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Neue Produkte anlegen
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {items && items.length > 0 ? (
          items.map((item) => (
            <MatchRow
              key={item.id}
              invoiceId={invoiceId}
              itemId={item.id}
              productName={item.product_name}
              defaultMatch={item.matched_product_id}
              options={options}
            />
          ))
        ) : (
          <EmptyState
             title="Alles erledigt"
             description="Keine offenen Positionen zum Matchen."
             action={
               <Link to="/invoices">
                 <Button>Zurueck zur Uebersicht</Button>
               </Link>
             }
          />
        )}
      </div>
    </div>
  )
}
