import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className
}: BottomSheetProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
        role="presentation" 
      />
      
      {/* Sheet Content */}
      <div className={cn(
        "relative z-10 w-full max-w-lg rounded-t-3xl border-t border-white/10 bg-card p-6 shadow-2xl transition-transform animate-accordion-up sm:rounded-2xl sm:border sm:animate-fade-in",
        className
      )}>
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-muted sm:hidden" />
        
        {title && (
          <div className="mb-4 pr-8">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
        )}

        <div className="mb-4">
           {children}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
