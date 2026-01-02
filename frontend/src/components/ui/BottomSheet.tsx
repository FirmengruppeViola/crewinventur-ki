import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="fixed inset-0" onClick={onClose} role="presentation" />
      <div className="relative z-10 w-full rounded-t-2xl bg-white p-5 shadow-xl">
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
      </div>
    </div>
  )
}
