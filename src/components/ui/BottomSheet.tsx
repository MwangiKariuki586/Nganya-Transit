/**
 * BottomSheet — Mobile-first overlay sheet.
 * Slides up from bottom with backdrop blur.
 * Used for edit profile, spot confirmation, and other mobile interactions.
 */

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface BottomSheetProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: ReactNode
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            return () => { document.body.style.overflow = '' }
        }
    }, [isOpen])

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null
    if (typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 z-[var(--z-modal)]" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet */}
            <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[var(--radius-xl)] bg-[var(--color-bg-surface)] border-t border-[var(--glass-border)] animate-slide-up-sheet overflow-hidden flex flex-col">
                {/* Drag handle */}
                <div className="flex justify-center py-3">
                    <div className="w-10 h-1 rounded-full bg-[var(--color-line-strong)]" />
                </div>

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-5 pb-4">
                        <h3 className="text-h3 text-[var(--color-text-primary)]">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 pb-8">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
