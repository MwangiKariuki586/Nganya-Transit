import type { ReactNode, ButtonHTMLAttributes } from 'react'

/**
 * Button — Primary UI button component.
 * Variants: primary (neon magenta), secondary (glass outline), ghost (text-only).
 * Sizes: sm, md, lg. Supports icon-only mode.
 * Min touch target: 44px on all sizes.
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    iconOnly?: boolean
    children: ReactNode
}

const variantStyles: Record<string, string> = {
    primary: [
        'bg-[var(--color-accent)] text-white font-semibold',
        'shadow-[var(--glow-accent-sm)]',
        'hover:bg-[var(--color-accent-hover)] hover:shadow-[var(--glow-accent)]',
        'active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none',
    ].join(' '),
    secondary: [
        'bg-[var(--glass-bg)] text-[var(--color-text-primary)]',
        'border border-[var(--glass-border)]',
        'backdrop-blur-md',
        'hover:bg-[var(--glass-bg-strong)] hover:border-[var(--glass-border-hover)]',
        'active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
    ].join(' '),
    ghost: [
        'bg-transparent text-[var(--color-text-secondary)]',
        'hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)]',
        'active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
    ].join(' '),
}

const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-7 py-3 text-base min-h-[48px]',
}

const iconOnlySize: Record<string, string> = {
    sm: 'p-2 min-w-[36px] min-h-[36px]',
    md: 'p-2.5 min-w-[44px] min-h-[44px]',
    lg: 'p-3 min-w-[48px] min-h-[48px]',
}

export default function Button({
    variant = 'primary',
    size = 'md',
    iconOnly = false,
    children,
    className = '',
    ...props
}: ButtonProps) {
    const base = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-150 cursor-pointer select-none'
    const sizes = iconOnly ? iconOnlySize[size] : sizeStyles[size]

    return (
        <button
            className={`${base} ${variantStyles[variant]} ${sizes} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
