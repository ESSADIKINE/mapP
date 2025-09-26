'use client'

type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface ToastDetail {
  id: number
  message: string
  variant: ToastVariant
  duration: number
}

export interface ToastOptions {
  duration?: number
}

const TOAST_ADD_EVENT = 'toast:add'
const TOAST_DISMISS_EVENT = 'toast:dismiss'

const toastEmitter = new EventTarget()

let toastId = 0
const DEFAULT_DURATION = 4000

function dispatchToast(variant: ToastVariant, message: string, options?: ToastOptions) {
  toastId += 1
  const detail: ToastDetail = {
    id: toastId,
    message,
    variant,
    duration: options?.duration ?? DEFAULT_DURATION,
  }

  toastEmitter.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_ADD_EVENT, { detail }))
  return detail.id
}

export const toast = {
  info(message: string, options?: ToastOptions) {
    return dispatchToast('info', message, options)
  },
  success(message: string, options?: ToastOptions) {
    return dispatchToast('success', message, options)
  },
  warning(message: string, options?: ToastOptions) {
    return dispatchToast('warning', message, options)
  },
  error(message: string, options?: ToastOptions) {
    return dispatchToast('error', message, options)
  },
  dismiss(id?: number) {
    toastEmitter.dispatchEvent(new CustomEvent<number | undefined>(TOAST_DISMISS_EVENT, { detail: id }))
  },
}

export { toastEmitter, TOAST_ADD_EVENT, TOAST_DISMISS_EVENT }

export type { ToastVariant }
