import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import {
  Camera,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Plus,
  Minus,
  ArrowLeft,
  Sparkles,
  Package,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useCamera } from '../../features/camera/useCamera'
import {
  useShelfScan,
  useAddScannedItem,
  type ScanResult,
} from '../../features/inventory/useInventoryScan'
import { useUiStore } from '../../stores/uiStore'

type ScanState = 'idle' | 'capturing' | 'processing' | 'result' | 'error'

export function ShelfScanPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useViewNavigate()
  const { takePhoto } = useCamera()
  const addToast = useUiStore((state) => state.addToast)

  const shelfScanMutation = useShelfScan(sessionId || '')
  const addItemMutation = useAddScannedItem(sessionId || '')

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [products, setProducts] = useState<ScanResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Quantities for each product
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
  // Track which products have been added
  const [addedProducts, setAddedProducts] = useState<Set<number>>(new Set())

  const currentProduct = products[currentIndex]
  const currentQty = quantities.get(currentIndex) ?? currentProduct?.suggested_quantity ?? 1

  const handleCapture = async () => {
    setScanState('capturing')
    try {
      const base64 = await takePhoto()
      if (!base64) {
        setScanState('idle')
        return
      }

      setScanState('processing')
      const result = await shelfScanMutation.mutateAsync(base64)
      setProducts(result.products)

      // Initialize quantities with AI suggestions
      const initialQtys = new Map<number, number>()
      result.products.forEach((p, i) => {
        initialQtys.set(i, p.suggested_quantity || 1)
      })
      setQuantities(initialQtys)
      setAddedProducts(new Set())
      setCurrentIndex(0)

      if (result.products.length > 0) {
        setScanState('result')
      } else {
        setErrorMessage('Keine Produkte erkannt')
        setScanState('error')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Scan fehlgeschlagen')
      setScanState('error')
    }
  }

  const handleAddCurrent = async () => {
    if (!currentProduct?.matched_product) return

    try {
      await addItemMutation.mutateAsync({
        product_id: currentProduct.matched_product.id,
        full_quantity: currentQty,
        unit_price: currentProduct.matched_product.last_price || undefined,
        ai_confidence: currentProduct.recognized_product.confidence,
        ai_suggested_quantity: currentProduct.suggested_quantity || undefined,
        scan_method: 'shelf',
        merge_mode: currentProduct.duplicate_in_session ? 'add' : undefined,
      })

      // Mark as added
      setAddedProducts((prev) => new Set(prev).add(currentIndex))

      // Move to next
      if (currentIndex < products.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // All done
        addToast(`${addedProducts.size + 1} Produkte hinzugefuegt`, 'success')
        navigate(`/inventory/sessions/${sessionId}`)
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Fehler beim Hinzufuegen',
        'error'
      )
    }
  }

  const handleSkip = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // All done (with skips)
      if (addedProducts.size > 0) {
        addToast(`${addedProducts.size} Produkte hinzugefuegt`, 'success')
      }
      navigate(`/inventory/sessions/${sessionId}`)
    }
  }

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(0, currentQty + delta)
    setQuantities((prev) => new Map(prev).set(currentIndex, newQty))
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
        <div className="flex-1">
          <h1 className="text-xl font-bold">Regal-Scan</h1>
          <p className="text-xs text-muted-foreground">
            Mehrere Produkte erkennen
          </p>
        </div>
        {scanState === 'result' && (
          <div className="text-right">
            <p className="text-sm font-medium">
              {currentIndex + 1} / {products.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {addedProducts.size} hinzugefuegt
            </p>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Idle / Capture States */}
        {(scanState === 'idle' || scanState === 'capturing') && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="p-6 rounded-3xl bg-violet-500/10">
              <Camera className="h-16 w-16 text-violet-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">Regal fotografieren</h2>
              <p className="text-muted-foreground mt-1">
                Fotografiere ein Regal mit mehreren Produkten
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleCapture}
              className="px-8"
              disabled={scanState === 'capturing'}
            >
              <Camera className="mr-2 h-5 w-5" />
              Foto aufnehmen
            </Button>
          </div>
        )}

        {/* Processing */}
        {scanState === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-violet-500 animate-pulse" />
              <Loader2 className="absolute -bottom-2 -right-2 h-8 w-8 text-violet-500 animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">KI analysiert Regal...</h2>
              <p className="text-muted-foreground mt-1">
                Produkte werden erkannt und gezaehlt
              </p>
            </div>
          </div>
        )}

        {/* Error */}
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
              <Button onClick={handleCapture}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </div>
          </div>
        )}

        {/* Result - Swipe Cards */}
        {scanState === 'result' && currentProduct && (
          <div className="space-y-6">
            {/* Progress Dots */}
            <div className="flex justify-center gap-1.5">
              {products.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? 'w-6 bg-primary'
                      : addedProducts.has(i)
                        ? 'w-2 bg-emerald-500'
                        : i < currentIndex
                          ? 'w-2 bg-muted-foreground/30'
                          : 'w-2 bg-muted-foreground/20'
                  }`}
                />
              ))}
            </div>

            {/* Product Card */}
            <Card className="p-6 space-y-5 animate-slide-in-right">
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-2xl bg-violet-500/10">
                  <Package className="h-10 w-10 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xl truncate">
                      {currentProduct.recognized_product.product_name}
                    </h3>
                    {currentProduct.is_new && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                        Neu
                      </span>
                    )}
                  </div>
                  {currentProduct.recognized_product.brand && (
                    <p className="text-muted-foreground text-lg">
                      {currentProduct.recognized_product.brand}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {currentProduct.recognized_product.size_display && (
                      <span>{currentProduct.recognized_product.size_display}</span>
                    )}
                    {currentProduct.recognized_product.category && (
                      <>
                        <span>·</span>
                        <span>{currentProduct.recognized_product.category}</span>
                      </>
                    )}
                  </div>

                  {/* Confidence */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full bg-violet-500 transition-all"
                        style={{
                          width: `${(currentProduct.recognized_product.confidence || 0) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((currentProduct.recognized_product.confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Price if available */}
              {currentProduct.matched_product?.last_price && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-muted-foreground">Preis</span>
                  <span className="font-bold text-xl">
                    {currentProduct.matched_product.last_price.toFixed(2)} EUR
                  </span>
                </div>
              )}

              {/* Duplicate Warning */}
              {currentProduct.duplicate_in_session && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-200">
                    Bereits {currentProduct.duplicate_in_session.quantity}x in Session
                  </p>
                </div>
              )}

              {/* Quantity Input */}
              <div className="pt-4 border-t border-border">
                <label className="text-sm text-muted-foreground mb-3 block">
                  Erkannte Menge (anpassen falls noetig)
                </label>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="p-4 rounded-2xl bg-accent hover:bg-accent/80 transition-colors"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <span className="text-5xl font-bold min-w-[80px] text-center">
                    {currentQty}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="p-4 rounded-2xl bg-accent hover:bg-accent/80 transition-colors"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </Card>

            {/* Navigation Arrows */}
            <div className="flex justify-center gap-4">
              {currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {currentIndex < products.length - 1 && (
                <button
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Action Buttons - Sticky at bottom */}
      {scanState === 'result' && currentProduct && (
        <div className="flex-shrink-0 p-4 bg-background border-t border-border safe-area-bottom">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              variant="outline"
              className="flex-1 h-14"
              onClick={handleSkip}
            >
              <X className="mr-2 h-5 w-5" />
              Ueberspringen
            </Button>
            <Button
              className="flex-1 h-14"
              onClick={handleAddCurrent}
              loading={addItemMutation.isPending}
              disabled={!currentProduct.matched_product}
            >
              <Check className="mr-2 h-5 w-5" />
              Hinzufuegen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
