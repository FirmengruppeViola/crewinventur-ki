import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { OverlayPortal } from './OverlayPortal'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  placement?: 'bottom' | 'center'
  showDragHandle?: boolean
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  placement = 'bottom',
  showDragHandle = true,
}: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const isCentered = placement === 'center'

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!shouldRender) return null

  return (
    <OverlayPortal>
      <div
        className={cn(
          'fixed inset-0 z-[200] flex justify-center',
          isCentered ? 'items-center px-4 py-6' : 'items-end sm:items-center'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-background/70 backdrop-blur-md transition-opacity duration-300',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
          role="presentation"
        />

        <div
          className={cn(
            'relative z-10 w-full max-w-lg glass-card shadow-2xl transition-all duration-300 ease-spring',
            isCentered
              ? 'rounded-3xl p-6'
              : 'rounded-t-3xl border-t border-border sm:rounded-3xl sm:border p-6',
            isCentered
              ? isVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-8 scale-95 opacity-0'
              : isVisible
                ? 'translate-y-0 scale-100'
                : 'translate-y-full scale-95',
            className,
          )}
          role="dialog"
          aria-modal="true"
        >
          {!isCentered && showDragHandle && (
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-muted" />
          )}

          {title && (
            <div className="mb-5 flex items-start justify-between">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 hover:scale-110"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="max-h-[75vh] overflow-y-auto scrollbar-thin pb-2">
            {children}
          </div>
        </div>
      </div>
    </OverlayPortal>
  )
}
