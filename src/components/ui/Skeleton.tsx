/**
 * Skeleton — Shimmer loading placeholders.
 * Used for cards, images, text lines while content loads.
 */

interface SkeletonProps {
    className?: string
    variant?: 'text' | 'circular' | 'rectangular' | 'card'
}

export default function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
    const variants: Record<string, string> = {
        text: 'h-4 w-3/4 rounded-[var(--radius-sm)]',
        circular: 'w-10 h-10 rounded-full',
        rectangular: 'h-32 w-full rounded-[var(--radius-md)]',
        card: 'h-56 w-full rounded-[var(--radius-lg)]',
    }

    return (
        <div
            className={`animate-skeleton bg-[var(--glass-bg)] ${variants[variant]} ${className}`}
            aria-hidden="true"
            role="presentation"
        />
    )
}

/**
 * CardSkeleton — Full card loading placeholder.
 * Matches the layout of a standard nganya card.
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-[var(--radius-lg)] overflow-hidden bg-[var(--glass-bg)] border border-[var(--glass-border)] ${className}`}>
            {/* Image placeholder */}
            <Skeleton variant="rectangular" className="h-40 rounded-none" />
            {/* Content area */}
            <div className="p-4 space-y-3">
                <Skeleton variant="text" className="h-5 w-2/3" />
                <Skeleton variant="text" className="h-3 w-full" />
                <div className="flex gap-2">
                    <Skeleton variant="text" className="h-5 w-16" />
                    <Skeleton variant="text" className="h-5 w-20" />
                </div>
            </div>
        </div>
    )
}
