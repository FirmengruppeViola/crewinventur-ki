import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Package,
  AlertTriangle,
  Euro,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import {
  useMissingPrices,
  useUpdateItemPrice,
} from '../../features/inventory/useInventory'
import { useUiStore } from '../../stores/uiStore'

export function PriceReviewPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useViewNavigate()
  const addToast = useUiStore((state) => state.addToast)

  const { data: missingPrices } = useMissingPrices(sessionId)
  const updatePrice = useUpdateItemPrice(sessionId || '')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [prices, setPrices] = useState<Map<string, string>>(new Map())
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())

  const items = missingPrices?.items || []
  const currentItem = items[currentIndex]
  const currentPrice = prices.get(currentItem?.item_id || '') || ''

  const handlePriceChange = (value: string) => {
    if (!currentItem) return
    setPrices((prev) => new Map(prev).set(currentItem.item_id, value))
  }

  const handleSave = async () => {
    if (!currentItem || !currentPrice) return

    const numPrice = parseFloat(currentPrice.replace(',', '.'))
    if (isNaN(numPrice) || numPrice <= 0) {
      addToast('Bitte gueltigen Preis eingeben', 'error')
      return
    }

    try {
      await updatePrice.mutateAsync({
        itemId: currentItem.item_id,
        unitPrice: numPrice,
      })

      setSavedItems((prev) => new Set(prev).add(currentItem.item_id))

      // Move to next or finish
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        addToast('Alle Preise eingetragen', 'success')
        navigate(`/inventory/sessions/${sessionId}/summary`)
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Fehler beim Speichern',
        'error'
      )
    }
  }

  const handleSkip = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Finish even with skips
      const savedCount = savedItems.size
      if (savedCount > 0) {
        addToast(`${savedCount} Preise eingetragen`, 'success')
      }
      navigate(`/inventory/sessions/${sessionId}/summary`)
    }
  }

  const handleBack = () => {
    navigate(`/inventory/sessions/${sessionId}/summary`)
  }

  // Show stable layout even while loading - prevents "jump"
  if (!missingPrices || !items.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center max-w-sm mx-auto">
          <Check className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Alles erledigt</h2>
          <p className="text-muted-foreground mb-4">
            Alle Produkte haben einen Preis.
          </p>
          <Button onClick={handleBack}>Zurueck zur Zusammenfassung</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 bg-background/80 backdrop-blur-xl px-4 py-4 border-b border-border">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Preise nachtragen</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} Produkte ohne Preis
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {currentIndex + 1} / {items.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {savedItems.size} eingetragen
          </p>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-40">
        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5">
          {items.map((item, i) => (
            <div
              key={item.item_id}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex
                  ? 'w-6 bg-primary'
                  : savedItems.has(item.item_id)
                    ? 'w-2 bg-emerald-500'
                    : i < currentIndex
                      ? 'w-2 bg-muted-foreground/30'
                      : 'w-2 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Current Item Card */}
        {currentItem && (
          <Card className="p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/10">
                <Package className="h-10 w-10 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xl truncate">
                    {currentItem.product_name}
                  </h3>
                </div>
                {currentItem.product_brand && (
                  <p className="text-muted-foreground text-lg">
                    {currentItem.product_brand}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Menge: {currentItem.quantity}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-200">
                Dieses Produkt hat keinen Einkaufspreis hinterlegt.
              </p>
            </div>

            {/* Price Input */}
            <div className="pt-4 border-t border-border">
              <label className="text-sm text-muted-foreground mb-3 block">
                Einzelpreis (EUR)
              </label>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={currentPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-4 text-2xl font-bold rounded-2xl bg-accent border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
          </Card>
        )}

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
          {currentIndex < items.length - 1 && (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="p-3 rounded-xl bg-accent hover:bg-accent/80 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons - Fixed */}
      <div className="fixed bottom-20 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            className="flex-1 h-14"
            onClick={handleSkip}
          >
            Ueberspringen
          </Button>
          <Button
            className="flex-1 h-14"
            onClick={handleSave}
            loading={updatePrice.isPending}
            disabled={!currentPrice}
          >
            <Check className="mr-2 h-5 w-5" />
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
}
