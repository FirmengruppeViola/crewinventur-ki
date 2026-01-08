import { useRef, type ChangeEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, ChevronRight, AlertCircle, CheckCircle2, RefreshCw, HelpCircle, FileStack, X, Brain, Receipt, Calendar, Zap } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { OnboardingSlides, type OnboardingSlide } from '../../components/ui/OnboardingSlides'
import { useInvoices, useUploadInvoice, useInvoiceItems, useProcessInvoice, type Invoice, type InvoiceItem } from '../../features/invoices/useInvoices'
import { useUiStore } from '../../stores/uiStore'

const ONBOARDING_DISMISSED_KEY = 'crewinventur-invoice-onboarding-dismissed'

const invoiceOnboardingSlides: OnboardingSlide[] = [
  {
    icon: Brain,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/20',
    title: 'KI-Power',
    subtitle: 'Unsere KI liest deine Rechnungen und extrahiert automatisch alle Preise.',
    highlight: 'Nie wieder manuell Preise eingeben!',
    animation: 'animate-float',
  },
  {
    icon: Receipt,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20',
    title: 'Welche Rechnungen?',
    subtitle: 'Alle Lieferantenrechnungen von Produkten, die du inventarisieren willst.',
    highlight: 'Getränke, Lebensmittel, Verbrauchsmaterial...',
    animation: 'animate-pulse-slow',
  },
  {
    icon: Calendar,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    title: 'Wie viele?',
    subtitle: 'Mindestens das letzte Quartal hochladen.',
    highlight: '3 Monate = die meisten Produkte erfasst',
    animation: 'animate-bounce-slow',
  },
  {
    icon: Zap,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    title: 'Das Ergebnis',
    subtitle: 'Beim Scannen kennt die App sofort den aktuellen Einkaufspreis.',
    highlight: 'Inventurwert auf Knopfdruck!',
    animation: 'animate-float',
  },
]

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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Multi-Upload State
  const [uploadProgress, setUploadProgress] = useState<{
    total: number
    current: number
    currentFile: string
    isUploading: boolean
  } | null>(null)

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
    const files = event.target.files
    if (!files || files.length === 0) return

    // Multi-file upload with progress
    const fileList = Array.from(files)
    setUploadProgress({
      total: fileList.length,
      current: 0,
      currentFile: fileList[0].name,
      isUploading: true,
    })

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      setUploadProgress({
        total: fileList.length,
        current: i + 1,
        currentFile: file.name,
        isUploading: true,
      })

      try {
        await uploadInvoice.mutateAsync(file)
        successCount++
      } catch (error) {
        errorCount++
        console.error(`Upload failed for ${file.name}:`, error)
      }
    }

    setUploadProgress(null)

    if (errorCount === 0) {
      addToast(
        fileList.length === 1
          ? 'Rechnung hochgeladen.'
          : `${successCount} Rechnungen hochgeladen.`,
        'success'
      )
    } else {
      addToast(
        `${successCount} erfolgreich, ${errorCount} fehlgeschlagen.`,
        errorCount === fileList.length ? 'error' : 'info'
      )
    }

    event.target.value = ''
  }

  const handleCancelUpload = () => {
    // Note: This doesn't actually cancel in-flight requests, just hides progress
    setUploadProgress(null)
  }

  if (isLoading) {
    return <ListPageSkeleton />
  }

  return (
    <>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingSlides
          slides={invoiceOnboardingSlides}
          onComplete={handleOnboardingComplete}
          finalButtonText="Alles klar!"
          dontShowAgainLabel="Nicht mehr anzeigen, ich weiß Bescheid"
        />
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

      {/* Hidden File Input - Multiple enabled */}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload Progress Overlay */}
      {uploadProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileStack className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Rechnungen hochladen</h3>
                  <p className="text-sm text-muted-foreground">
                    {uploadProgress.current} von {uploadProgress.total}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelUpload}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-accent overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {uploadProgress.currentFile}
              </p>
            </div>
          </Card>
        </div>
      )}

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
function InvoiceDetailSheet({ invoice, isOpen, onClose }: { invoice: Invoice | null, isOpen: boolean, onClose: () => void }) {
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
                 {items.map((item: InvoiceItem) => (
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
             
             <Link viewTransition to={`/invoices/${invoice.id}/match`} className="w-full">
                <Button variant="secondary" className="w-full h-12">
                   Artikel Matching öffnen
                </Button>
             </Link>
          </div>
       </div>
    </BottomSheet>
  )
}

