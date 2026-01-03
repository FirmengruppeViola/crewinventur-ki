import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { OverlayPortal } from './OverlayPortal'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 animate-fade-in">
        <div
          className="absolute inset-0"
          onClick={onClose}
          role="presentation"
        />
        <div
          className={cn(
            'relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-card p-6 shadow-2xl',
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            {title ? <h2 className="text-xl font-bold text-foreground">{title}</h2> : <span />}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </OverlayPortal>
  )
}
