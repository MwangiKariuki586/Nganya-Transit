/**
 * Chip — Route, status, and vibe tag chips.
 * Variants: route (corridor label), status (LIVE/SPOTTED), vibe (graffiti-styled).
 * Color-coded by type. 44px min height on mobile for touch accessibility.
 */

interface ChipProps {
    label: string
    variant?: 'route' | 'status' | 'vibe'
    color?: string // custom color override for vibe tags
    isActive?: boolean
    onClick?: () => void
    className?: string
}

export default function Chip({
    label,
    variant = 'route',
    color,
    isActive = false,
    onClick,
    className = '',
}: ChipProps) {
    const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-full)] font-medium transition-all duration-150 select-none'
    const interactive = onClick ? 'cursor-pointer active:scale-95' : ''

    const variants: Record<string, string> = {
        route: `
      px-3 py-1.5 text-xs min-h-[32px] backdrop-blur-md
      ${isActive
                ? 'bg-[var(--glass-bg)] text-[var(--color-text-primary)] border border-[var(--color-accent)]/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]'
                : 'bg-[rgba(255,255,255,0.02)] text-[var(--color-text-secondary)] border border-[var(--glass-border)] hover:border-[var(--color-accent)]/25 hover:text-[var(--color-text-primary)]'
            }
    `,
        status: `
      px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase min-h-[24px]
      bg-[var(--color-live-soft)] text-[var(--color-live)] border border-transparent
    `,
        vibe: `
      px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase min-h-[24px]
      border border-transparent
    `,
    }

    // Vibe tags use custom color or fallback
    const vibeStyle = variant === 'vibe' && color
        ? { backgroundColor: `${color}20`, color }
        : {}

    return (
        <span
            className={`${base} ${variants[variant]} ${interactive} ${className}`}
            style={vibeStyle}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
        >
            {label}
        </span>
    )
}
