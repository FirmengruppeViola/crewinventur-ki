import { CheckCircle, Info, TriangleAlert, X } from 'lucide-react'
import { useUiStore, type ToastMessage } from '../../stores/uiStore'
import { cn } from '../../lib/utils'

type ToastProps = ToastMessage & {
  onClose: () => void
}

const typeStyles = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
}

const typeIcons = {
  success: CheckCircle,
  error: TriangleAlert,
  info: Info,
}

export function Toast({ message, type, onClose }: ToastProps) {
  const Icon = typeIcons[type]
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm',
        typeStyles[type],
      )}
    >
      <Icon className="mt-0.5 h-5 w-5" />
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto text-current/70 hover:text-current"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts)
  const removeToast = useUiStore((state) => state.removeToast)

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 flex w-72 flex-col gap-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
