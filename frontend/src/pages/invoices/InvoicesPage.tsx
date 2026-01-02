import { useRef, type ChangeEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, ChevronRight, AlertCircle, CheckCircle2, RefreshCw, HelpCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Loading } from '../../components/ui/Loading'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { InvoiceOnboarding } from '../../components/ui/InvoiceOnboarding'
import { useInvoices, useUploadInvoice, useInvoiceItems, useProcessInvoice } from '../../features/invoices/useInvoices'
import { useUiStore } from '../../stores/uiStore'

const ONBOARDING_DISMISSED_KEY = 'crewinventur-invoice-onboarding-dismissed'

export function InvoicesPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const addToast = useUiStore((state) => state.addToast)
  const { data: invoices, isLoading } = useInvoices()
  const uploadInvoice = useUploadInvoice()

  // Onboarding State - show by default unless explicitly dismissed
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY)
    return dismissed !== 'true'
  })

  // Sheet State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)

  const handleOnboardingComplete = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
    }
    setShowOnboarding(false)
  }

  const handleShowOnboarding = () => {
    setShowOnboarding(true)
  }

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
    <>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <InvoiceOnboarding onComplete={handleOnboardingComplete} />
      )}

      <div className="space-y-6 pb-40">
        <header className="px-1 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Preise & Rechnungen</h1>
            <p className="text-sm text-muted-foreground">KI-gestützte Preiserfassung</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowOnboarding}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              title="Anleitung anzeigen"
            >
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </button>
            <Button size="icon" className="rounded-full h-12 w-12 shadow-lg shadow-primary/20" onClick={handlePickFile} loading={uploadInvoice.isPending}>
              <Upload className="h-6 w-6" />
            </Button>
          </div>
        </header>

      {invoices && invoices.length > 0 ? (
        <div className="grid gap-4">
          {invoices.map((invoice) => {
             const statusColor = 
               invoice.status === 'processed' ? 'text-emerald-500' :
               invoice.status === 'error' ? 'text-destructive' :
               'text-amber-500'
             
             const Icon = 
               invoice.status === 'processed' ? CheckCircle2 :
               invoice.status === 'error' ? AlertCircle :
               RefreshCw

            return (
              <Card 
                key={invoice.id} 
                onClick={() => setSelectedInvoice(invoice)}
                className="group flex cursor-pointer items-center gap-4 p-4 transition-all hover:bg-accent/50 active:scale-[0.99]"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card border border-border transition-colors ${statusColor.replace('text-', 'bg-').replace('500', '500/10')}`}>
                   <Icon className={`h-6 w-6 ${statusColor}`} />
                </div>
                <div className="flex-1 overflow-hidden">
                   <h3 className="truncate font-medium text-foreground">{invoice.supplier_name || invoice.file_name}</h3>
                   <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                     <span className={statusColor + " font-medium capitalize"}>{invoice.status}</span>
                     {invoice.total_amount && (
                       <span>· {Number(invoice.total_amount).toFixed(2)} €</span>
                     )}
                   </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="Keine Rechnungen"
          description="Lade deine erste Rechnung hoch, um zu starten."
          action={
            <Button onClick={handlePickFile} loading={uploadInvoice.isPending}>
              <Upload className="mr-2 h-4 w-4" /> Datei wählen
            </Button>
          }
        />
      )}

      {/* Hidden File Input */}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleFileChange}
      />

        {/* Detail Sheet */}
        <InvoiceDetailSheet
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      </div>
    </>
  )
}

// Sub-Component for Detail Logic to keep main component clean
function InvoiceDetailSheet({ invoice, isOpen, onClose }: { invoice: any, isOpen: boolean, onClose: () => void }) {
  const addToast = useUiStore((state) => state.addToast)
  const processInvoice = useProcessInvoice(invoice?.id || '')
  // We fetch items only when sheet is open and invoice exists
  // Note: Hooks rules require unconditional call, so we pass invoiceId or skip
  const { data: items } = useInvoiceItems(invoice?.id)

  const handleProcess = async () => {
    try {
      await processInvoice.mutateAsync()
      addToast('Verarbeitung gestartet.', 'success')
      onClose()
    } catch (error) {
      addToast('Fehler beim Starten.', 'error')
    }
  }

  if (!invoice) return null

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
       <div className="space-y-6 pb-6">
          <header className="border-b border-border pb-4">
             <h2 className="text-xl font-bold text-foreground truncate">{invoice.supplier_name || 'Rechnung'}</h2>
             <p className="text-sm text-muted-foreground">
                Status: <span className="capitalize text-foreground font-medium">{invoice.status}</span>
             </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
             <div className="rounded-xl bg-accent/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">Datum</p>
                <p className="font-semibold text-foreground">{invoice.invoice_date || '-'}</p>
             </div>
             <div className="rounded-xl bg-accent/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">Summe</p>
                <p className="font-semibold text-foreground">
                  {invoice.total_amount ? Number(invoice.total_amount).toFixed(2) + ' €' : '-'}
                </p>
             </div>
          </div>
          
          {invoice.processing_error && (
             <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
               Fehler: {invoice.processing_error}
             </div>
          )}

          {/* Items Preview */}
          <div className="space-y-3">
             <h3 className="text-sm font-medium text-muted-foreground">Positionen ({items?.length || 0})</h3>
             {items && items.length > 0 ? (
               <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                 {items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm border-b border-border/50 pb-2">
                       <span className="text-foreground truncate max-w-[70%]">{item.product_name}</span>
                       <span className="text-muted-foreground">{Number(item.unit_price).toFixed(2)} €</span>
                    </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-muted-foreground italic">Keine Positionen erkannt.</p>
             )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
             {invoice.status === 'draft' || invoice.status === 'error' ? (
                <Button className="w-full h-12" onClick={handleProcess} loading={processInvoice.isPending}>
                  KI-Verarbeitung starten
                </Button>
             ) : null}
             
             <Link to={`/invoices/${invoice.id}/match`} className="w-full">
                <Button variant="secondary" className="w-full h-12">
                   Artikel Matching öffnen
                </Button>
             </Link>
          </div>
       </div>
    </BottomSheet>
  )
}
