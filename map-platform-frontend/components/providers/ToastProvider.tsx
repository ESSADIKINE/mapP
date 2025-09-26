'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { toast, toastEmitter, TOAST_ADD_EVENT, TOAST_DISMISS_EVENT, type ToastDetail, type ToastVariant } from '@/lib/toast'

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: 'bg-sky-600 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-400 text-navy-900',
  error: 'bg-rose-600 text-white',
}

const CLOSE_BUTTON_STYLES: Record<ToastVariant, string> = {
  info: 'text-white hover:bg-white/20',
  success: 'text-white hover:bg-white/20',
  warning: 'text-navy-900 hover:bg-black/10',
  error: 'text-white hover:bg-white/20',
}

const CLOSE_BUTTON_BACKGROUND: Record<ToastVariant, string> = {
  info: 'bg-white/10',
  success: 'bg-white/10',
  warning: 'bg-black/5',
  error: 'bg-white/10',
}

export function ToastProvider() {
  const [mounted, setMounted] = useState(false)
  const [toasts, setToasts] = useState<ToastDetail[]>([])
  const timeouts = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    setMounted(true)
  }, [])

  const clearTimeoutFor = useCallback((id: number) => {
    const timeoutId = timeouts.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeouts.current.delete(id)
    }
  }, [])

  useEffect(() => {
    const handleAdd = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail
      setToasts((prev) => {
        const next = [...prev, detail]
        if (next.length > 4) {
          const [removed, ...rest] = next
          clearTimeoutFor(removed.id)
          return rest
        }
        return next
      })
      const timeoutId = window.setTimeout(() => {
        toast.dismiss(detail.id)
      }, detail.duration)
      timeouts.current.set(detail.id, timeoutId)
    }

    const handleDismiss = (event: Event) => {
      const id = (event as CustomEvent<number | undefined>).detail
      setToasts((prev) => {
        if (typeof id === 'number') {
          return prev.filter((item) => item.id !== id)
        }
        return []
      })
      if (typeof id === 'number') {
        clearTimeoutFor(id)
      } else {
        timeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
        timeouts.current.clear()
      }
    }

    toastEmitter.addEventListener(TOAST_ADD_EVENT, handleAdd as EventListener)
    toastEmitter.addEventListener(TOAST_DISMISS_EVENT, handleDismiss as EventListener)

    return () => {
      toastEmitter.removeEventListener(TOAST_ADD_EVENT, handleAdd as EventListener)
      toastEmitter.removeEventListener(TOAST_DISMISS_EVENT, handleDismiss as EventListener)
      timeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeouts.current.clear()
    }
  }, [clearTimeoutFor])

  const portalContent = useMemo(() => {
    if (!mounted) return null

    return createPortal(
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-end gap-3 p-4 sm:items-end sm:p-6">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-3 rounded-2xl px-4 py-3 shadow-xl ring-1 ring-black/10 ${VARIANT_STYLES[item.variant]} transition`}
            role={item.variant === 'error' || item.variant === 'warning' ? 'alert' : 'status'}
            aria-live={item.variant === 'error' || item.variant === 'warning' ? 'assertive' : 'polite'}
          >
            <div className="flex-1 text-sm font-medium leading-snug">{item.message}</div>
            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              className={`rounded-full p-1 transition ${CLOSE_BUTTON_BACKGROUND[item.variant]} ${CLOSE_BUTTON_STYLES[item.variant]}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>,
      document.body,
    )
  }, [mounted, toasts])

  return portalContent
}
