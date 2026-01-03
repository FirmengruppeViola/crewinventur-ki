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
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  placement = 'bottom'
}: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const isCentered = placement === 'center'

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Small delay to allow browser to paint the 'transform-y-full' state first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
      // Wait for animation to finish before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300) // Match duration-300
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
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ease-spring',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
          role="presentation"
        />

        {/* Sheet Content */}
        <div
          className={cn(
            'relative z-10 w-full max-w-lg bg-card p-6 shadow-2xl transition-all duration-300 ease-spring',
            isCentered
              ? 'rounded-2xl border border-white/10'
              : 'rounded-t-3xl border-t border-white/10 sm:rounded-2xl sm:border',
            isCentered
              ? isVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-4 scale-95 opacity-0'
              : isVisible
                ? 'translate-y-0 scale-100'
                : 'translate-y-full scale-95',
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          {!isCentered && (
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-muted sm:hidden" />
          )}

          {title && (
            <div className="mb-4 pr-8">
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
            </div>
          )}

          <div className="mb-4 max-h-[80vh] overflow-y-auto">
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
    </OverlayPortal>
  )
}
