/**
 * Modal — Desktop variant of BottomSheet.
 * Centered card with backdrop blur and scale-in animation.
 */

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    size?: 'sm' | 'md' | 'lg'
}

const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
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
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal card */}
            <div className={`relative w-full ${sizes[size]} max-h-[80vh] rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--glass-border)] shadow-[var(--shadow-xl)] animate-scale-in overflow-hidden flex flex-col`}>
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-line)]">
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
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
