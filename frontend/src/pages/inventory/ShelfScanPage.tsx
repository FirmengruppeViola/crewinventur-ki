import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import {
  Camera,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useCamera } from '../../features/camera/useCamera'
import {
  useShelfScan,
  useAddScannedItem,
  type ScanResult,
} from '../../features/inventory/useInventoryScan'
import { useCategories } from '../../features/products/useCategories'
import { useUiStore } from '../../stores/uiStore'

type ScanState = 'idle' | 'capturing' | 'processing' | 'result' | 'error'

// CrewMate messages based on scan result
function getCrewMateMessage(products: ScanResult[], unclearCount: number): string {
  if (products.length === 0) {
    return 'Hmm, ich konnte leider keine Produkte erkennen. Versuch es nochmal mit einem anderen Winkel!'
  }
  if (unclearCount === 0) {
    return `Hey, ich hab ${products.length} Produkte erkannt! Sieht gut aus - pruef kurz die Mengen und dann ab in die Inventur.`
  }
  if (unclearCount === products.length) {
    return `Ich hab ${products.length} Produkte gefunden, bin mir aber bei allen noch unsicher. Schau sie dir bitte genauer an!`
  }
  return `Hey, ich hab ${products.length} Produkte erkannt! Bei ${unclearCount} bin ich mir noch nicht ganz sicher - die hab ich markiert.`
}

type ProductItemProps = {
  product: ScanResult
  index: number
  quantity: number
  categoryId: string
  onQuantityChange: (value: number) => void
  onCategoryChange: (value: string) => void
  onRemove: () => void
  categories: { label: string; value: string }[]
  isExpanded: boolean
  onToggle: () => void
}

function ProductItem({
  product,
  quantity,
  categoryId,
  onQuantityChange,
  onCategoryChange,
  onRemove,
  categories,
  isExpanded,
  onToggle,
}: ProductItemProps) {
  const recognition = product.recognized_product
  const isUnclear = product.needs_category || recognition.confidence < 0.7
  const hasNoMatch = !product.matched_product

  return (
    <div className={`border rounded-xl overflow-hidden ${
      isUnclear ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'
    }`}>
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`p-2 rounded-lg ${isUnclear ? 'bg-amber-500/20' : 'bg-primary/10'}`}>
          <Package className={`h-5 w-5 ${isUnclear ? 'text-amber-500' : 'text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {recognition.brand ? `${recognition.brand} ` : ''}
              {recognition.product_name}
            </span>
            {isUnclear && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400 shrink-0">
                Pruefe
              </span>
            )}
            {hasNoMatch && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-violet-500/20 text-violet-400 shrink-0">
                Neu
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {recognition.size_display && <span>{recognition.size_display}</span>}
            {recognition.category && recognition.category !== 'Unbekannt' && (
              <>
                <span>·</span>
                <span>{recognition.category}</span>
              </>
            )}
            {quantity > 0 && (
              <>
                <span>·</span>
                <span className="font-medium text-foreground">{quantity}x</span>
              </>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
          {/* Confidence Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sicherheit:</span>
            <div className="h-1.5 flex-1 rounded-full bg-accent overflow-hidden">
              <div
                className={`h-full transition-all ${
                  recognition.confidence >= 0.7 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${(recognition.confidence || 0) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round((recognition.confidence || 0) * 100)}%
            </span>
          </div>

          {/* Quantity & Category Row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Anzahl"
              type="number"
              min={0}
              value={quantity.toString()}
              onChange={(e) => onQuantityChange(Number(e.target.value) || 0)}
            />
            {(product.needs_category || recognition.category === 'Unbekannt') && (
              <Select
                label="Kategorie"
                name="category"
                value={categoryId}
                onChange={(e) => onCategoryChange(e.target.value)}
                options={[
                  { label: 'Bitte waehlen...', value: '' },
                  ...categories,
                ]}
              />
            )}
          </div>

          {/* Duplicate Warning */}
          {product.duplicate_in_session && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-amber-200">
                Bereits {product.duplicate_in_session.quantity}x in dieser Session
              </span>
            </div>
          )}

          {/* Remove Button */}
          <button
            onClick={onRemove}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
            Nicht hinzufuegen
          </button>
        </div>
      )}
    </div>
  )
}

export function ShelfScanPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useViewNavigate()
  const { takePhoto } = useCamera()
  const addToast = useUiStore((state) => state.addToast)
  const { data: categoriesData } = useCategories()

  const shelfScanMutation = useShelfScan(sessionId || '')
  const addItemMutation = useAddScannedItem(sessionId || '')

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [products, setProducts] = useState<ScanResult[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Data for each product
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
  const [categories, setCategories] = useState<Map<number, string>>(new Map())
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Category options for dropdown
  const categoryOptions = useMemo(() => {
    return (categoriesData || []).map((cat) => ({
      label: cat.name,
      value: cat.id,
    }))
  }, [categoriesData])

  // Count unclear products
  const unclearCount = useMemo(() => {
    return products.filter(
      (p) => p.needs_category || p.recognized_product.confidence < 0.7
    ).length
  }, [products])

  // Active products (not removed)
  const activeProducts = useMemo(() => {
    return products.filter((_, i) => !removed.has(i))
  }, [products, removed])

  // Check if all required fields are filled
  const canSave = useMemo(() => {
    for (let i = 0; i < products.length; i++) {
      if (removed.has(i)) continue
      const product = products[i]
      const qty = quantities.get(i) ?? 0
      if (qty <= 0) return false
      if (!product.matched_product) return false
      // If needs category, must have one selected
      if (product.needs_category || product.recognized_product.category === 'Unbekannt') {
        if (!categories.get(i)) return false
      }
    }
    return activeProducts.length > 0
  }, [products, quantities, categories, removed, activeProducts])

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

      // Initialize quantities (all empty - user fills in)
      const initialQtys = new Map<number, number>()
      const initialCats = new Map<number, string>()
      result.products.forEach((p, i) => {
        initialQtys.set(i, 0) // User must enter
        // Pre-fill category if matched product has one
        if (p.matched_product?.category_id) {
          initialCats.set(i, p.matched_product.category_id)
        }
      })
      setQuantities(initialQtys)
      setCategories(initialCats)
      setRemoved(new Set())
      setExpandedIndex(null)

      if (result.products.length > 0) {
        setScanState('result')
        // Auto-expand first unclear product, or first product if all clear
        const firstUnclear = result.products.findIndex(
          (p) => p.needs_category || p.recognized_product.confidence < 0.7
        )
        setExpandedIndex(firstUnclear >= 0 ? firstUnclear : 0)
      } else {
        setErrorMessage('Keine Produkte erkannt')
        setScanState('error')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Scan fehlgeschlagen')
      setScanState('error')
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    let savedCount = 0
    const errors: string[] = []

    for (let i = 0; i < products.length; i++) {
      if (removed.has(i)) continue

      const product = products[i]
      if (!product.matched_product) continue

      const qty = quantities.get(i) ?? 0
      if (qty <= 0) continue

      try {
        await addItemMutation.mutateAsync({
          product_id: product.matched_product.id,
          full_quantity: qty,
          unit_price: product.matched_product.last_price || undefined,
          ai_confidence: product.recognized_product.confidence,
          scan_method: 'shelf',
          merge_mode: product.duplicate_in_session ? 'add' : undefined,
        })
        savedCount++
      } catch (error) {
        errors.push(product.recognized_product.product_name)
      }
    }

    setIsSaving(false)

    if (savedCount > 0) {
      addToast(`${savedCount} Produkte hinzugefuegt!`, 'success')
    }
    if (errors.length > 0) {
      addToast(`Fehler bei: ${errors.join(', ')}`, 'error')
    }

    navigate(`/inventory/sessions/${sessionId}`)
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 bg-background/80 backdrop-blur-xl px-4 py-4 border-b border-border sticky top-0 z-10">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Regal-Scan</h1>
          <p className="text-xs text-muted-foreground">
            {scanState === 'result'
              ? `${activeProducts.length} Produkte`
              : 'Mehrere Produkte erkennen'}
          </p>
        </div>
        {scanState === 'result' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCapture}
          >
            <Camera className="h-4 w-4 mr-1" />
            Neu
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
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

        {/* Processing - CrewMate thinking */}
        {scanState === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-violet-500 animate-pulse" />
              <Loader2 className="absolute -bottom-2 -right-2 h-8 w-8 text-violet-500 animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">Moment, ich schau mir das an...</h2>
              <p className="text-muted-foreground mt-1">
                CrewMate analysiert das Regal
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
              <h2 className="text-xl font-semibold">Das hat nicht geklappt</h2>
              <p className="text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack}>
                Abbrechen
              </Button>
              <Button onClick={handleCapture}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Nochmal versuchen
              </Button>
            </div>
          </div>
        )}

        {/* Result - Product List */}
        {scanState === 'result' && (
          <div className="space-y-4">
            {/* CrewMate Message */}
            <Card className="p-4 border-violet-500/30 bg-violet-500/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-violet-500/20 shrink-0">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-violet-300">CrewMate</p>
                  <p className="text-sm text-foreground/80 mt-1">
                    {getCrewMateMessage(products, unclearCount)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Product List */}
            <div className="space-y-2">
              {products.map((product, index) => {
                if (removed.has(index)) return null
                return (
                  <ProductItem
                    key={index}
                    product={product}
                    index={index}
                    quantity={quantities.get(index) ?? 0}
                    categoryId={categories.get(index) ?? ''}
                    onQuantityChange={(value) =>
                      setQuantities((prev) => new Map(prev).set(index, value))
                    }
                    onCategoryChange={(value) =>
                      setCategories((prev) => new Map(prev).set(index, value))
                    }
                    onRemove={() => setRemoved((prev) => new Set(prev).add(index))}
                    categories={categoryOptions}
                    isExpanded={expandedIndex === index}
                    onToggle={() =>
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                  />
                )
              })}
            </div>

            {/* Removed count */}
            {removed.size > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {removed.size} Produkt{removed.size > 1 ? 'e' : ''} ausgeschlossen
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      {scanState === 'result' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border safe-area-bottom">
          <Button
            className="w-full h-14"
            onClick={handleSaveAll}
            loading={isSaving}
            disabled={!canSave}
          >
            <Check className="mr-2 h-5 w-5" />
            {activeProducts.length} Produkte hinzufuegen
          </Button>
        </div>
      )}
    </div>
  )
}
