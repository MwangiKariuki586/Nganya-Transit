/**
 * EmptyState — Placeholder for empty content areas.
 * Variants: no-following, no-results, offline.
 * Icon + message + optional CTA.
 */

import { Heart, SearchX, WifiOff } from 'lucide-react'
import Button from './Button'

interface EmptyStateProps {
    variant?: 'no-following' | 'no-results' | 'offline'
    title?: string
    message?: string
    actionLabel?: string
    onAction?: () => void
    className?: string
}

const defaults = {
    'no-following': {
        icon: Heart,
        title: 'No nganyas followed yet',
        message: 'Start following your favorite nganyas to see them here.',
        actionLabel: 'Discover nganyas',
    },
    'no-results': {
        icon: SearchX,
        title: 'Nothing spotted yet',
        message: 'Try adjusting your search or filters.',
        actionLabel: 'Clear filters',
    },
    offline: {
        icon: WifiOff,
        title: 'You\'re offline',
        message: 'Check your connection and try again.',
        actionLabel: 'Retry',
    },
}

export default function EmptyState({
    variant = 'no-results',
    title,
    message,
    actionLabel,
    onAction,
    className = '',
}: EmptyStateProps) {
    const config = defaults[variant]
    const Icon = config.icon

    return (
        <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
            {/* Icon container with subtle glow */}
            <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center mb-5">
                <Icon className="w-7 h-7 text-[var(--color-text-tertiary)]" />
            </div>

            <h3 className="text-h4 text-[var(--color-text-primary)] mb-2">
                {title || config.title}
            </h3>

            <p className="text-body-sm text-[var(--color-text-tertiary)] max-w-xs mb-6">
                {message || config.message}
            </p>

            {onAction && (
                <Button variant="secondary" size="md" onClick={onAction}>
                    {actionLabel || config.actionLabel}
                </Button>
            )}
        </div>
    )
}
