import type { ReactNode, ButtonHTMLAttributes } from 'react'

/**
 * Button — Primary UI button component.
 * Variants: primary (neon magenta), secondary (glass outline), ghost (text-only).
 * Sizes: sm, md, lg. Supports icon-only mode.
 * Min touch target: 44px on all sizes.
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'primaryOutline' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    iconOnly?: boolean
    isLoading?: boolean
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
    primaryOutline: [
        'bg-transparent text-[var(--color-accent)] font-semibold',
        'border border-[var(--color-accent)]',
        'hover:bg-[var(--color-accent)] hover:text-white',
        'hover:shadow-[var(--glow-accent-sm)]',
        'active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-accent)] disabled:hover:shadow-none',
    ].join(' '),
    secondary: [
        'bg-[var(--glass-bg)] text-[var(--color-text-primary)] font-medium',
        'border border-[var(--color-accent)]/20',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]',
        'backdrop-blur-md',
        'transition-all duration-200',
        'hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-soft)]',
        'hover:shadow-[0_0_22px_-10px_rgba(255,45,120,0.45)]',
        'hover:-translate-y-px',
        'active:scale-[0.98] active:translate-y-0',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0',
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
    isLoading = false,
    children,
    className = '',
    ...props
}: ButtonProps) {
    const base = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-150 cursor-pointer select-none'
    const sizes = iconOnly ? iconOnlySize[size] : sizeStyles[size]

    return (
        <button
            className={`${base} ${variantStyles[variant]} ${sizes} ${className} ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {!isLoading && children}
            {isLoading && typeof children === 'string' && 'Processing...'}
        </button>
    )
}
