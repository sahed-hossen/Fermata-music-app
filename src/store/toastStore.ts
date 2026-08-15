import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

let toastCounter = 0

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (type, message, duration) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const toast: Toast = { id, type, message, duration: duration ?? (type === 'error' ? 5000 : 3000) }
    set((state) => ({
      toasts: [...state.toasts.slice(-4), toast], // Keep max 5
    }))

    // Auto-remove
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, toast.duration)
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  success: (message) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const toast: Toast = { id, type: 'success', message, duration: 3000 }
    set((state) => ({ toasts: [...state.toasts.slice(-4), toast] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },

  error: (message) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const toast: Toast = { id, type: 'error', message, duration: 5000 }
    set((state) => ({ toasts: [...state.toasts.slice(-4), toast] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  },

  info: (message) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const toast: Toast = { id, type: 'info', message, duration: 3000 }
    set((state) => ({ toasts: [...state.toasts.slice(-4), toast] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },

  warning: (message) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const toast: Toast = { id, type: 'warning', message, duration: 4000 }
    set((state) => ({ toasts: [...state.toasts.slice(-4), toast] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
}))
