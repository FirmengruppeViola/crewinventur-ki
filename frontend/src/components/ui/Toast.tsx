import { CheckCircle, Info, TriangleAlert, XCircle, X } from 'lucide-react'
import { useUiStore, type ToastMessage } from '../../stores/uiStore'
import { cn } from '../../lib/utils'

type ToastProps = ToastMessage & {
  onClose: () => void
}

const typeStyles = {
  success: 'border-success/50 bg-success/10 text-success-foreground',
  error: 'border-destructive/50 bg-destructive/10 text-destructive-foreground',
  info: 'border-primary/50 bg-primary/10 text-primary-foreground',
  warning: 'border-warning/50 bg-warning/10 text-warning-foreground',
}

const typeIcons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
}

export function Toast({ message, type, onClose, actionLabel, onAction }: ToastProps) {
  const Icon = typeIcons[type]
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-4 shadow-lg animate-slide-in-right',
        typeStyles[type],
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-2">
        <span className="block text-sm font-medium leading-relaxed">{message}</span>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={() => {
              onAction()
              onClose()
            }}
            className="text-xs font-semibold uppercase tracking-wide text-current/80 hover:text-current transition-colors"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex-shrink-0 ml-2 text-current/70 hover:text-current hover:scale-110 transition-all"
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
    <div className="fixed top-20 right-4 z-[150] flex w-80 flex-col gap-3 safe-area-top sm:top-24">
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
