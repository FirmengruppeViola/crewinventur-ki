import { useState } from 'react'
import { ChevronDown, ChevronRight, Check, Trash2, Scan } from 'lucide-react'
import { Button } from '../ui/Button'

type InventoryItemAccordionProps = {
  item: {
    id: string
    session_id: string
    product_id: string
    full_quantity: number | null
    partial_quantity: number | null
    partial_fill_percent: number | null
    quantity: number | null
    unit_price: number | null
    total_price: number | null
    previous_quantity: number | null
    quantity_difference: number | null
    scanned_at: string | null
    scan_method: 'photo' | 'shelf' | 'barcode' | 'manual' | null
    ai_confidence: number | null
    notes?: string | null
  }
  product: { name: string; brand?: string }
  onUpdate: (updates: {
    full_quantity?: number
    partial_quantity?: number
    partial_fill_percent?: number
    unit_price?: number
    notes?: string
  }) => void
  onDelete: () => void
  isExpanded: boolean
  onToggle: () => void
  isDeleting?: boolean
}

export function InventoryItemAccordion({
  item,
  product,
  onUpdate,
  onDelete,
  isExpanded,
  onToggle,
  isDeleting,
}: InventoryItemAccordionProps) {
  const [localFullQty, setLocalFullQty] = useState(item.full_quantity || 0)
  const [localPartialQty, setLocalPartialQty] = useState(item.partial_quantity || 0)
  const [localPartialPct, setLocalPartialPct] = useState(item.partial_fill_percent || 0)
  const [localPrice, setLocalPrice] = useState(item.unit_price || 0)
  const [localNotes, setLocalNotes] = useState(item.notes || '')
  
  const handlePartialQtyChange = (value: number) => {
    setLocalPartialQty(value)
    setLocalPartialPct(Math.round(value * 100))
  }
 
  const handlePartialPctChange = (value: number) => {
    setLocalPartialPct(value)
    setLocalPartialQty(value / 100)
  }
 
  const displayQty = localPartialQty > 0
    ? `${localFullQty} + ${localPartialPct}%`
    : localFullQty.toString()
  
  const handleSave = () => {
    onUpdate({
      full_quantity: localFullQty,
      partial_quantity: localPartialQty,
      partial_fill_percent: localPartialPct,
      unit_price: localPrice,
      notes: localNotes,
    })
  }
 
  const getScanMethodLabel = () => {
    switch (item.scan_method) {
      case 'photo':
        return 'Foto-Scan'
      case 'shelf':
        return 'Regal-Scan'
      case 'barcode':
        return 'Barcode-Scan'
      case 'manual':
        return 'Manuell'
      default:
        return ''
    }
  }
 
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={onToggle}
        className="group w-full flex items-center gap-3 py-3.5 px-2 text-left hover:bg-primary/10 transition-all duration-200"
      >
        <div className="w-6 h-6 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
            {product.brand ? `${product.brand} ` : ''}{product.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {displayQty} × {(item.unit_price ?? 0).toFixed(2)} EUR
          </p>
        </div>
        
        <div className="text-right">
          <p className="font-semibold text-foreground">
            {(item.total_price ?? 0).toFixed(2)} EUR
          </p>
        </div>
      </button>
 
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 bg-primary/5 animate-fade-in-up">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Volle Einheiten
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={localFullQty}
                onChange={(e) => setLocalFullQty(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border focus:border-primary focus:border-primary/20 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Anbruch (0-1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localPartialQty}
                  onChange={(e) => handlePartialQtyChange(Math.max(0, Math.min(1, Number(e.target.value))))}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border focus:border-primary focus:border-primary/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Anbruch (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localPartialPct}
                  onChange={(e) => handlePartialPctChange(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border focus:border-primary focus:border-primary/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Einzelpreis (EUR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={localPrice}
              onChange={(e) => setLocalPrice(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border focus:border-primary focus:border-primary/20 outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Notizen
            </label>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="z.B. Flasche beschädigt, Sonderangebot..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border focus:border-primary focus:border-primary/20 outline-none resize-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-secondary/40">
            <Scan className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {getScanMethodLabel()}
            </span>
            {item.ai_confidence && (
              <span className="text-xs text-primary font-medium">
                · KI: {Math.round(item.ai_confidence * 100)}%
              </span>
            )}
          </div>
          
          {item.previous_quantity !== null && item.quantity_difference !== null && (
            <div className={`p-2.5 rounded-xl ${
              item.quantity_difference > 0 
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            }`}>
              <span className="text-sm font-medium">
                Vorher: {item.previous_quantity} · 
                Differenz: {item.quantity_difference > 0 ? '+' : ''}{item.quantity_difference}
              </span>
            </div>
          )}
          
          <div className="flex gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="flex-1 hover:border-primary/50"
            >
              <Check className="h-4 w-4 mr-1" />
              Speichern
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={onDelete}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {isDeleting ? 'Lösche...' : 'Entfernen'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
