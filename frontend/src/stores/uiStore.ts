import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export type ToastMessage = {
  id: string
  message: string
  type: ToastType
  actionLabel?: string
  onAction?: () => void
}

type UIState = {
  toasts: ToastMessage[]
  isGlobalLoading: boolean
  setGlobalLoading: (value: boolean) => void
  addToast: (
    message: string,
    type?: ToastType,
    action?: { label: string; onAction: () => void },
  ) => void
  removeToast: (id: string) => void
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useUiStore = create<UIState>((set) => ({
  toasts: [],
  isGlobalLoading: false,
  setGlobalLoading: (value) => set({ isGlobalLoading: value }),
  addToast: (message, type = 'info', action) => {
    const id = createId()
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          message,
          type,
          actionLabel: action?.label,
          onAction: action?.onAction,
        },
      ],
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }))
    }, 4000)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))
