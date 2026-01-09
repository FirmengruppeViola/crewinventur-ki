import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import {
  Camera,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useCamera } from '../../features/camera/useCamera'
import {
  useShelfScan,
  useAddScannedItem,
  useInventoryScan,
  type ScanResult,
} from '../../features/inventory/useInventoryScan'
import { useCategories } from '../../features/products/useCategories'
import { useUnitSizeOptions } from '../../features/products/useUnitSizes'
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
  unitSizeId: string
  onQuantityChange: (value: number) => void
  onCategoryChange: (value: string) => void
  onUnitSizeChange: (value: string) => void
  onRemove: () => void
  onRescan: () => void
  categories: { label: string; value: string }[]
  unitSizeOptions: { label: string; value: string }[]
  isExpanded: boolean
  onToggle: () => void
  isSaving: boolean
  hasFailed: boolean
}

function ProductItem({
  product,
  quantity,
  categoryId,
  unitSizeId,
  onQuantityChange,
  onCategoryChange,
  onUnitSizeChange,
  onRemove,
  onRescan,
  categories,
  unitSizeOptions,
  isExpanded,
  onToggle,
  isSaving,
  hasFailed,
}: ProductItemProps) {
  const recognition = product.recognized_product
  const isUnclear = product.needs_category || recognition.confidence < 0.7
  const hasNoMatch = !product.matched_product

  // Get current unit label
  const currentUnit = unitSizeOptions.find(u => u.value === unitSizeId)?.label || recognition.size_display || ''

  return (
    <div className={`border-b border-border/50 last:border-0 ${hasFailed ? 'bg-destructive/10' : ''}`}>
      {/* Header - Always visible, compact row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3 px-2 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="w-6 h-6 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">
              {recognition.brand ? `${recognition.brand} ` : ''}
              {recognition.product_name}
            </span>
            {currentUnit && (
              <span className="text-sm text-muted-foreground">· {currentUnit}</span>
            )}
            {isUnclear && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                Pruefe
              </span>
            )}
            {hasNoMatch && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-violet-500/20 text-violet-400">
                Neu
              </span>
            )}
            {hasFailed && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-destructive/20 text-destructive">
                Fehler
              </span>
            )}
            {quantity > 0 && (
              <span className="text-sm font-medium text-primary">{quantity}x</span>
            )}
          </div>
          {recognition.category && recognition.category !== 'Unbekannt' && (
            <div className="text-xs text-muted-foreground mt-0.5">{recognition.category}</div>
          )}
        </div>

        {/* Confidence indicator */}
        <div className="text-xs text-muted-foreground px-2">
          {Math.round((recognition.confidence || 0) * 100)}%
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 bg-accent/10">
          {/* Fields Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Anzahl */}
            <Input
              label="Anzahl"
              type="number"
              min={0}
              value={quantity.toString()}
              onChange={(e) => onQuantityChange(Number(e.target.value) || 0)}
              autoFocus
            />

            {/* Einheit */}
            <Select
              label="Einheit"
              name="unitSize"
              value={unitSizeId}
              onChange={(e) => onUnitSizeChange(e.target.value)}
              options={[
                { label: currentUnit || 'Erkannt...', value: '' },
                ...unitSizeOptions,
              ]}
            />
          </div>

          {/* Kategorie (when needed) */}
          {(product.needs_category || recognition.category === 'Unbekannt') && (
            <Select
              label="Kategorie *"
              name="category"
              value={categoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
              options={[
                { label: 'Bitte waehlen...', value: '' },
                ...categories,
              ]}
            />
          )}

          {/* Duplicate Warning */}
          {product.duplicate_in_session && (
            <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-amber-200">
                Bereits {product.duplicate_in_session.quantity}x in dieser Session
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            {/* Rescan for unclear products */}
            {isUnclear && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRescan}
                disabled={isSaving}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-1" />
                Nochmal scannen
              </Button>
            )}

            {/* Remove */}
            <button
              onClick={onRemove}
              className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
              Entfernen
            </button>
          </div>
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
  const singleScanMutation = useInventoryScan(sessionId || '')

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [products, setProducts] = useState<ScanResult[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Data for each product
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
  const [categories, setCategories] = useState<Map<number, string>>(new Map())
  const [unitSizes, setUnitSizes] = useState<Map<number, string>>(new Map())
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [rescanningIndex, setRescanningIndex] = useState<number | null>(null)
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set())

  // Category options for dropdown
  const categoryOptions = useMemo(() => {
    return (categoriesData || []).map((cat) => ({
      label: cat.name,
      value: cat.id,
    }))
  }, [categoriesData])

  // Unit size options - load all, filtered by category would be possible
  const { options: unitSizeOptions } = useUnitSizeOptions()

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

      // Initialize data
      const initialQtys = new Map<number, number>()
      const initialCats = new Map<number, string>()
      const initialUnits = new Map<number, string>()
      result.products.forEach((p, i) => {
        initialQtys.set(i, 0)
        if (p.matched_product?.category_id) {
          initialCats.set(i, p.matched_product.category_id)
        }
        // Pre-fill unit if we can match it
        if (p.recognized_product.size_display) {
          const matchingUnit = unitSizeOptions.find(u =>
            u.label.toLowerCase().includes(p.recognized_product.size_display?.toLowerCase() || '')
          )
          if (matchingUnit) {
            initialUnits.set(i, matchingUnit.value)
          }
        }
      })
      setQuantities(initialQtys)
      setCategories(initialCats)
      setUnitSizes(initialUnits)
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

  // Rescan a single product
  const handleRescan = async (index: number) => {
    setRescanningIndex(index)
    try {
      const base64 = await takePhoto()
      if (!base64) {
        setRescanningIndex(null)
        return
      }

      const result = await singleScanMutation.mutateAsync(base64)

      // Replace the product at index with new scan result
      setProducts((prev) => {
        const newProducts = [...prev]
        newProducts[index] = result
        return newProducts
      })

      addToast('Produkt neu gescannt', 'success')

      // Re-expand this item to show the new result
      setExpandedIndex(index)
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Rescan fehlgeschlagen', 'error')
    } finally {
      setRescanningIndex(null)
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setFailedIndices(new Set())

    let savedCount = 0
    const newFailed = new Set<number>()

    for (let i = 0; i < products.length; i++) {
      if (removed.has(i)) continue

      const product = products[i]
      const qty = quantities.get(i) ?? 0

      if (qty <= 0) continue

      if (!product.matched_product?.id) {
        newFailed.add(i)
        continue
      }

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
        newFailed.add(i)
      }
    }

    setIsSaving(false)
    setFailedIndices(newFailed)

    if (savedCount > 0) {
      addToast(`${savedCount} Produkte hinzugefuegt!`, 'success')
    }

    if (newFailed.size === 0) {
      navigate(`/inventory/sessions/${sessionId}`)
    } else {
      addToast(`${newFailed.size} Produkte fehlgeschlagen - bitte pruefen`, 'error')
    }
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

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Idle / Capture States */}
        {(scanState === 'idle' || scanState === 'capturing') && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
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
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
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
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
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
                <Camera className="mr-2 h-4 w-4" />
                Nochmal versuchen
              </Button>
            </div>
          </div>
        )}

        {/* Result - Product List */}
        {scanState === 'result' && (
          <div className="space-y-4 px-4">
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

            {/* Product List - Compact accordion style */}
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              {products.map((product, index) => {
                if (removed.has(index)) return null
                return (
                  <ProductItem
                    key={index}
                    product={product}
                    index={index}
                    quantity={quantities.get(index) ?? 0}
                    categoryId={categories.get(index) ?? ''}
                    unitSizeId={unitSizes.get(index) ?? ''}
                    onQuantityChange={(value) =>
                      setQuantities((prev) => new Map(prev).set(index, value))
                    }
                    onCategoryChange={(value) =>
                      setCategories((prev) => new Map(prev).set(index, value))
                    }
                    onUnitSizeChange={(value) =>
                      setUnitSizes((prev) => new Map(prev).set(index, value))
                    }
                    onRemove={() => setRemoved((prev) => new Set(prev).add(index))}
                    onRescan={() => handleRescan(index)}
                    categories={categoryOptions}
                    unitSizeOptions={unitSizeOptions}
                    isExpanded={expandedIndex === index}
                    onToggle={() =>
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                    isSaving={isSaving || rescanningIndex === index}
                    hasFailed={failedIndices.has(index)}
                  />
                )
              })}
            </div>

            {/* Removed count */}
            {removed.size > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {removed.size} Produkt{removed.size > 1 ? 'e' : ''} ausgeblendet
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      {scanState === 'result' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border safe-area-bottom">
          {failedIndices.size > 0 ? (
            <Button
              className="w-full h-14"
              variant="outline"
              onClick={() => navigate(`/inventory/sessions/${sessionId}`)}
            >
              Trotzdem zur Inventurliste
            </Button>
          ) : (
            <Button
              className="w-full h-14"
              onClick={handleSaveAll}
              loading={isSaving}
              disabled={!canSave}
            >
              <Check className="mr-2 h-5 w-5" />
              {activeProducts.length} Produkte hinzufuegen
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
