import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { OverlayPortal } from './OverlayPortal'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-none',
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
        <div
          className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          role="presentation"
        />
        <div
          className={cn(
            'relative z-10 w-full animate-spring-in rounded-3xl border border-border bg-card p-6 shadow-2xl',
            sizeStyles[size],
            !showCloseButton && 'pt-6',
          )}
          role="dialog"
          aria-modal="true"
        >
          {title && (
            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 hover:scale-110"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div>{children}</div>
        </div>
      </div>
    </OverlayPortal>
  )
}
