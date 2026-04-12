/**
 * Toast — Snackbar notification with auto-dismiss.
 * Glass style. Supports info, success, error states.
 * Renders via a simple provider + hook pattern.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { getUserMessage, toAppError } from '@/shared/errors/app-error'
import { reportAppError } from '@/shared/errors/reporting'

// ─── Types ─────────────────────────────────────────────────
type ToastType = 'info' | 'success' | 'error'

interface ToastMessage {
    id: number
    type: ToastType
    message: string
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType) => void
    showErrorToast: (error: unknown, fallbackMessage?: string) => void
}

// ─── Context ───────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}

// ─── Provider ──────────────────────────────────────────────
let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++toastId
        setToasts((prev) => [...prev, { id, type, message }])

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const showErrorToast = useCallback((error: unknown, fallbackMessage?: string) => {
        const normalized = toAppError(error)
        reportAppError(normalized, { area: 'mutation' })
        addToast(fallbackMessage || getUserMessage(normalized), 'error')
    }, [addToast])

    return (
        <ToastContext.Provider value={{ addToast, showErrorToast }}>
            {children}

            {/* Toast container — fixed bottom center */}
            <div
                className="fixed bottom-[calc(var(--bottom-nav-height)+16px)] md:bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-toast)] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none"
                aria-live="polite"
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

// ─── Single Toast ──────────────────────────────────────────
const icons = {
    info: Info,
    success: CheckCircle,
    error: AlertCircle,
}

const typeStyles = {
    info: 'border-[var(--glass-border)]',
    success: 'border-[rgba(57,255,20,0.3)]',
    error: 'border-[rgba(255,68,68,0.3)]',
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
    const Icon = icons[toast.type]

    return (
        <div
            className={`animate-slide-up pointer-events-auto w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] backdrop-blur-lg border ${typeStyles[toast.type]} shadow-[var(--shadow-lg)]`}
            role="alert"
        >
            <Icon className="w-4 h-4 shrink-0" style={{
                color: toast.type === 'success' ? 'var(--color-success)'
                    : toast.type === 'error' ? 'var(--color-error)'
                        : 'var(--color-cyan)'
            }} />

            <span className="text-sm text-[var(--color-text-primary)] flex-1">
                {toast.message}
            </span>

            <button
                onClick={onClose}
                className="p-1 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                aria-label="Dismiss"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
