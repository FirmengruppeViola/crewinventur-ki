import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { OverlayPortal } from '../ui/OverlayPortal'

type DrawerProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  placement?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  placement = 'left',
  size = 'md',
}: DrawerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

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

  const sizeStyles = {
    sm: 'w-72',
    md: 'w-80',
    lg: 'w-96',
  }

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[200]">
        <div
          className={cn(
            'absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
          role="presentation"
        />
        <aside
          className={cn(
            'absolute top-0 bottom-0 glass-card shadow-2xl transition-all duration-300 ease-spring',
            placement === 'left' ? 'left-0' : 'right-0',
            sizeStyles[size],
            placement === 'left'
              ? isVisible
                ? 'translate-x-0'
                : '-translate-x-full'
              : isVisible
                ? 'translate-x-0'
                : 'translate-x-full',
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-border/50 p-5">
              {title ? (
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 hover:scale-110"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {children}
            </div>
          </div>
        </aside>
      </div>
    </OverlayPortal>
  )
}
