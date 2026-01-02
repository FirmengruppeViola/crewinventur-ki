import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type DrawerProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40">
      <div className="fixed inset-0" onClick={onClose} role="presentation" />
      <aside className="relative z-10 h-full w-72 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </aside>
    </div>
  )
}
