import { useRef, type ChangeEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, ChevronRight, AlertCircle, CheckCircle2, RefreshCw, HelpCircle, FileStack, X, Brain, Receipt, Calendar, Zap, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { OnboardingSlides, type OnboardingSlide } from '../../components/ui/OnboardingSlides'
import { useInvoices, useUploadInvoice, useInvoiceItems, useProcessInvoice, type Invoice, type InvoiceItem } from '../../features/invoices/useInvoices'
import { useUiStore } from '../../stores/uiStore'

const ONBOARDING_DISMISSED_KEY = 'crewinventur-invoice-onboarding-dismissed'

const invoiceOnboardingSlides: OnboardingSlide[] = [
  {
    icon: Brain,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/20',
    title: 'KI-Power',
    subtitle: 'Unsere KI liest deine Rechnungen und extrahiert automatisch alle Preise.',
    highlight: 'Nie wieder manuell Preise eingeben!',
    animation: 'animate-float',
  },
  {
    icon: Receipt,
    iconColor: 'text-success',
    iconBg: 'bg-success/20',
    title: 'Welche Rechnungen?',
    subtitle: 'Alle Lieferantenrechnungen von Produkten, die du inventarisieren willst.',
    highlight: 'Getränke, Lebensmittel, Verbrauchsmaterial...',
    animation: 'animate-pulse-slow',
  },
  {
    icon: Calendar,
    iconColor: 'text-warning',
    iconBg: 'bg-warning/20',
    title: 'Wie viele?',
    subtitle: 'Mindestens das letzte Quartal hochladen.',
    highlight: '3 Monate = die meisten Produkte erfasst',
    animation: 'animate-bounce-slow',
  },
  {
    icon: Zap,
    iconColor: 'text-blue-500',
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
  const { data: invoices } = useInvoices()
  const uploadInvoice = useUploadInvoice()
  
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY)
    return dismissed !== 'true'
  })
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  
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
    setUploadProgress(null)
  }
  
  return (
    <>
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
            <p className="text-sm text-muted-foreground">KI-gestützte Preisfassung</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowOnboarding}
              className="p-2 rounded-full hover:bg-primary/10 transition-colors"
              title="Anleitung anzeigen"
            >
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </button>
            <Button size="icon" className="rounded-full h-12 w-12 shadow-glow hover:scale-105 active:scale-95 transition-all" onClick={handlePickFile} loading={uploadInvoice.isPending}>
              <Upload className="h-6 w-6" />
            </Button>
          </div>
        </header>
        
        {invoices && invoices.length > 0 ? (
          <div className="grid gap-4">
            {invoices.map((invoice, index) => {
              const statusColor = 
                invoice.status === 'processed' ? 'text-success' :
                invoice.status === 'error' ? 'text-destructive' :
                'text-warning'
              
              const Icon = 
                invoice.status === 'processed' ? CheckCircle2 :
                invoice.status === 'error' ? AlertCircle :
                RefreshCw
              
              return (
                <Card 
                  key={invoice.id} 
                  variant="glass"
                  hoverable
                  onClick={() => setSelectedInvoice(invoice)}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card border-2 border-border transition-colors ${
                    invoice.status === 'processed' ? 'border-success' :
                    invoice.status === 'error' ? 'border-destructive' :
                    'border-warning'
                  } ${statusColor.replace('text-', 'bg-').replace('-500', '-500/10')}`}>
                    <Icon className={`h-6 w-6 ${statusColor}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="truncate font-semibold text-foreground">{invoice.supplier_name || invoice.file_name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className={`${statusColor} font-medium capitalize`}>{invoice.status}</span>
                      {invoice.total_amount && (
                        <span>· {Number(invoice.total_amount).toFixed(2)} €</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 mb-4">
              <FileStack className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Keine Rechnungen</h3>
            <p className="text-muted-foreground mt-2">
              Lade deine erste Rechnung hoch, um zu starten.
            </p>
          </div>
        )}
        
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        
        {uploadProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-sm mx-4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <FileStack className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Rechnungen hochladen</h3>
                    <p className="text-sm text-muted-foreground">
                      {uploadProgress.current} von {uploadProgress.total}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelUpload}
                  className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
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
        
        <InvoiceDetailSheet
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      </div>
    </>
  )
}

function InvoiceDetailSheet({ invoice, isOpen, onClose }: { invoice: Invoice | null, isOpen: boolean, onClose: () => void }) {
  const addToast = useUiStore((state) => state.addToast)
  const processInvoice = useProcessInvoice(invoice?.id || '')
  const { data: items } = useInvoiceItems(invoice?.id)
  
  const handleProcess = async () => {
    try {
      await processInvoice.mutateAsync()
      addToast('Verarbeitung gestartet.', 'success')
      onClose()
    } catch {
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
            <div className="rounded-2xl bg-secondary/40 p-5">
               <p className="text-xs text-muted-foreground mb-1">Datum</p>
               <p className="font-semibold text-foreground">{invoice.invoice_date || '-'}</p>
            </div>
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5">
               <p className="text-xs text-muted-foreground mb-1">Summe</p>
               <p className="font-semibold text-foreground">
                 {invoice.total_amount ? Number(invoice.total_amount).toFixed(2) + ' €' : '-'}
               </p>
            </div>
         </div>
           
         {invoice.processing_error && (
           <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                Fehler: {invoice.processing_error}
              </div>
         )}
         
         <div className="space-y-3">
           <h3 className="text-sm font-medium text-muted-foreground">Positionen ({items?.length || 0})</h3>
           {items && items.length > 0 ? (
             <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-2 pr-2">
               {items.map((item: InvoiceItem) => (
                 <div key={item.id} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                    <span className="text-foreground truncate max-w-[60%]">{item.product_name}</span>
                    <span className="text-muted-foreground">{Number(item.unit_price).toFixed(2)} €</span>
                 </div>
               ))}
             </div>
           ) : (
             <p className="text-sm text-muted-foreground italic">Keine Positionen erkannt.</p>
           )}
         </div>
         
         <div className="flex flex-col gap-3 pt-2">
              {(invoice.status === 'pending' || invoice.status === 'error') && (
                <Button className="w-full h-12 shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all" onClick={handleProcess} loading={processInvoice.isPending} disabled={processInvoice.isPending}>
                  <Sparkles className="mr-2 h-5 w-5" />
                  KI-Verarbeitung starten
                </Button>
              )}
           
           <Link viewTransition to={`/invoices/${invoice.id}/match`} className="w-full">
             <Button variant="secondary" className="w-full h-12 hover:bg-secondary/80">
               Artikel Matching öffnen
             </Button>
           </Link>
         </div>
       </div>
    </BottomSheet>
  )
}
