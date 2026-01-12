import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import {
  Camera,
  Loader2,
  Check,
  AlertTriangle,
  Plus,
  Minus,
  ArrowLeft,
  Sparkles,
  Package,
  RefreshCw,
  Search,
  HelpCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { useCamera } from '../../features/camera/useCamera'
import {
  useInventoryScan,
  useAddScannedItem,
  type ScanResult,
} from '../../features/inventory/useInventoryScan'
import { useUiStore } from '../../stores/uiStore'

type ScanState = 'idle' | 'capturing' | 'processing' | 'result' | 'error'

export function InventoryScanPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useViewNavigate()
  const { takePhoto } = useCamera()
  const addToast = useUiStore((state) => state.addToast)

  const scanMutation = useInventoryScan(sessionId || '')
  const addItemMutation = useAddScannedItem(sessionId || '')

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Quantity input state
  const [fullQuantity, setFullQuantity] = useState(1)
  const [hasPartial, setHasPartial] = useState(false)
  const [partialPercent, setPartialPercent] = useState(50)

  // Duplicate modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)

  // Manual product selection (when AI fails)
  const [showManualSelect, setShowManualSelect] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleCapture = async () => {
    setScanState('capturing')
    try {
      const base64 = await takePhoto()
      if (!base64) {
        setScanState('idle')
        return
      }

      setScanState('processing')
      const result = await scanMutation.mutateAsync(base64)
      setScanResult(result)

      // Set suggested quantity from AI
      if (result.suggested_quantity) {
        setFullQuantity(result.suggested_quantity)
      }

      // Check for duplicate
      if (result.duplicate_in_session) {
        setShowDuplicateModal(true)
      }

      setScanState('result')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Scan fehlgeschlagen')
      setScanState('error')
    }
  }

  const handleAddItem = async (mergeMode?: 'add' | 'replace') => {
    if (!scanResult?.matched_product) return

    const partialQty = hasPartial ? partialPercent / 100 : 0

    try {
      await addItemMutation.mutateAsync({
        product_id: scanResult.matched_product.id,
        full_quantity: fullQuantity,
        partial_quantity: partialQty,
        partial_fill_percent: hasPartial ? partialPercent : 0,
        unit_price: scanResult.matched_product.last_price || undefined,
        ai_confidence: scanResult.recognized_product.confidence,
        scan_method: 'photo',
        merge_mode: mergeMode,
      })

      addToast('Produkt hinzugefuegt', 'success')

      // Reset and go back or continue scanning
      setScanResult(null)
      setScanState('idle')
      setFullQuantity(1)
      setHasPartial(false)
      setShowDuplicateModal(false)
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Fehler beim Hinzufuegen',
        'error'
      )
    }
  }

  const handleRetry = () => {
    setScanResult(null)
    setScanState('idle')
    setErrorMessage(null)
    handleCapture()
  }

  const handleBack = () => {
    navigate(`/inventory/sessions/${sessionId}`)
  }

  // Auto-trigger camera on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scanState === 'idle') {
        handleCapture()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 bg-background/80 backdrop-blur-xl px-4 py-4 border-b border-border">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Produkt scannen</h1>
          <p className="text-xs text-muted-foreground">KI-Erkennung aktiv</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Scan States */}
        {scanState === 'idle' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="p-6 rounded-3xl bg-primary/10">
              <Camera className="h-16 w-16 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">Bereit zum Scannen</h2>
              <p className="text-muted-foreground mt-1">
                Fotografiere ein Produkt zur Erkennung
              </p>
            </div>
            <Button size="lg" onClick={handleCapture} className="px-8">
              <Camera className="mr-2 h-5 w-5" />
              Foto aufnehmen
            </Button>
          </div>
        )}

        {scanState === 'capturing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Camera className="h-16 w-16 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Kamera wird geoeffnet...</p>
          </div>
        )}

        {scanState === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
              <Loader2 className="absolute -bottom-2 -right-2 h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">KI analysiert...</h2>
              <p className="text-muted-foreground mt-1">
                Produkt wird erkannt und klassifiziert
              </p>
            </div>
          </div>
        )}

        {scanState === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="p-6 rounded-3xl bg-destructive/10">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">Fehler</h2>
              <p className="text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack}>
                Abbrechen
              </Button>
              <Button onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </div>
          </div>
        )}

        {scanState === 'result' && scanResult && (
          <div className="space-y-6">
            {/* Warning: Product not matched */}
            {!scanResult.matched_product && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <HelpCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-400">Produkt nicht in Datenbank</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Die KI hat das Produkt erkannt, aber es existiert noch nicht in deiner Produktliste.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowManualSelect(true)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Manuell suchen
                  </Button>
                </div>
              </div>
            )}

            {/* Warning: Low confidence */}
            {scanResult.recognized_product.confidence < 0.5 && scanResult.matched_product && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-400">Niedrige Erkennungssicherheit</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Die KI ist sich nicht sicher. Bitte pruefe das Produkt vor dem Hinzufuegen.
                  </p>
                </div>
              </div>
            )}

            {/* Recognized Product Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg truncate">
                      {scanResult.recognized_product.product_name}
                    </h3>
                    {scanResult.is_new && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                        Neu
                      </span>
                    )}
                  </div>
                  {scanResult.recognized_product.brand && (
                    <p className="text-muted-foreground">
                      {scanResult.recognized_product.brand}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {scanResult.recognized_product.size_display && (
                      <span>{scanResult.recognized_product.size_display}</span>
                    )}
                    {scanResult.recognized_product.category && (
                      <>
                        <span>·</span>
                        <span>{scanResult.recognized_product.category}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(scanResult.recognized_product.confidence || 0) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((scanResult.recognized_product.confidence || 0) * 100)}% Konfidenz
                    </span>
                  </div>
                </div>
              </div>

              {/* Price if available */}
              {scanResult.matched_product?.last_price && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Letzter Preis</span>
                  <span className="font-semibold text-lg">
                    {scanResult.matched_product.last_price.toFixed(2)} EUR
                  </span>
                </div>
              )}
            </Card>

            {/* Quantity Input */}
            <Card className="p-5 space-y-5">
              <h3 className="font-semibold">Menge eingeben</h3>

              {/* Full Quantity */}
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">
                  Volle Einheiten
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setFullQuantity(Math.max(0, fullQuantity - 1))}
                    className="p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    value={fullQuantity}
                    onChange={(e) => setFullQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center text-3xl font-bold bg-transparent border-none focus:outline-none"
                  />
                  <button
                    onClick={() => setFullQuantity(fullQuantity + 1)}
                    className="p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Partial (Anbruch) Toggle */}
              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => setHasPartial(!hasPartial)}
                  className="flex items-center justify-between w-full"
                >
                  <span className="text-sm font-medium">
                    + Angebrochene Einheit
                  </span>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      hasPartial ? 'bg-primary' : 'bg-accent'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                        hasPartial ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>

                {hasPartial && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    <label className="text-sm text-muted-foreground">
                      Fuellstand: {partialPercent}%
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="5"
                      value={partialPercent}
                      onChange={(e) => setPartialPercent(parseInt(e.target.value))}
                      className="w-full h-2 rounded-full bg-accent appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-6
                        [&::-webkit-slider-thumb]:h-6
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-primary
                        [&::-webkit-slider-thumb]:shadow-lg"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fast leer</span>
                      <span>Halb voll</span>
                      <span>Fast voll</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gesamt</span>
                  <span className="font-bold text-xl">
                    {(fullQuantity + (hasPartial ? partialPercent / 100 : 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

          </div>
        )}
      </div>

      {/* Action Buttons - Sticky at bottom, only shown in result state */}
      {scanState === 'result' && scanResult && (
        <div className="flex-shrink-0 p-4 bg-background border-t border-border safe-area-bottom">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              variant="outline"
              className="flex-1 h-14"
              onClick={handleCapture}
            >
              <Camera className="mr-2 h-5 w-5" />
              Neues Foto
            </Button>
            <Button
              className="flex-1 h-14"
              onClick={() =>
                scanResult.duplicate_in_session
                  ? setShowDuplicateModal(true)
                  : handleAddItem()
              }
              loading={addItemMutation.isPending}
              disabled={!scanResult.matched_product}
            >
              <Check className="mr-2 h-5 w-5" />
              Hinzufuegen
            </Button>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      <BottomSheet
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
      >
        <div className="space-y-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Produkt bereits erfasst</h2>
              <p className="text-muted-foreground mt-1">
                Dieses Produkt ist bereits in dieser Session mit{' '}
                <span className="font-semibold text-foreground">
                  {scanResult?.duplicate_in_session?.quantity || 0}
                </span>{' '}
                Stueck erfasst.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-14"
              onClick={() => handleAddItem('add')}
              loading={addItemMutation.isPending}
            >
              <Plus className="mr-2 h-5 w-5" />
              Menge addieren (+{fullQuantity + (hasPartial ? partialPercent / 100 : 0)})
            </Button>
            <Button
              variant="secondary"
              className="w-full h-14"
              onClick={() => handleAddItem('replace')}
              loading={addItemMutation.isPending}
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Menge ersetzen
            </Button>
            <Button
              variant="outline"
              className="w-full h-14"
              onClick={() => setShowDuplicateModal(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Manual Product Selection */}
      <BottomSheet
        isOpen={showManualSelect}
        onClose={() => setShowManualSelect(false)}
      >
        <div className="space-y-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-primary/20">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Produkt manuell zuordnen</h2>
              <p className="text-muted-foreground mt-1">
                Waehle eine Option um das Produkt zuzuordnen
              </p>
            </div>
          </div>

          {scanResult?.recognized_product && (
            <div className="p-4 rounded-xl bg-accent/50">
              <p className="text-sm text-muted-foreground">KI-Erkennung:</p>
              <p className="font-medium">
                {scanResult.recognized_product.brand && `${scanResult.recognized_product.brand} `}
                {scanResult.recognized_product.product_name}
                {scanResult.recognized_product.size_display && ` (${scanResult.recognized_product.size_display})`}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full h-14"
              disabled={isNavigating}
              onClick={async () => {
                if (isNavigating) return
                setIsNavigating(true)
                // Navigate to product creation with pre-filled AI data
                const params = new URLSearchParams()
                if (scanResult?.recognized_product) {
                  params.set('name', scanResult.recognized_product.product_name || '')
                  params.set('brand', scanResult.recognized_product.brand || '')
                  params.set('size', scanResult.recognized_product.size_display || '')
                  params.set('category', scanResult.recognized_product.category || '')
                }
                params.set('returnTo', `/inventory/sessions/${sessionId}/scan`)
                navigate(`/products/new?${params.toString()}`)
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Neues Produkt anlegen
            </Button>
            <Button
              variant="secondary"
              className="w-full h-14"
              disabled={isNavigating}
              onClick={() => {
                if (isNavigating) return
                setIsNavigating(true)
                // Navigate to product list for manual selection
                navigate(`/products?select=true&returnTo=/inventory/sessions/${sessionId}/scan`)
              }}
            >
              <Search className="mr-2 h-5 w-5" />
              Bestehendes Produkt suchen
            </Button>
            <Button
              variant="outline"
              className="w-full h-14"
              onClick={() => {
                setIsNavigating(false)
                setShowManualSelect(false)
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
