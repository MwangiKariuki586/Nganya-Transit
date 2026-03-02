/**
 * SearchInput — Glass-style search field with icon.
 * Focus glow border, placeholder microcopy.
 */

import { Search, X } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value?: string
    onChange?: (value: string) => void
    onClear?: () => void
}

export default function SearchInput({
    value: controlledValue,
    onChange,
    onClear,
    placeholder = 'Search nganyas, routes, vibes...',
    className = '',
    ...props
}: SearchInputProps) {
    const [internalValue, setInternalValue] = useState('')
    const value = controlledValue ?? internalValue

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        setInternalValue(v)
        onChange?.(v)
    }

    const handleClear = () => {
        setInternalValue('')
        onChange?.('')
        onClear?.()
    }

    return (
        <div className={`relative ${className}`}>
            {/* Search icon */}
            <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--color-text-tertiary)] pointer-events-none"
                strokeWidth={2}
            />

            <input
                type="search"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full pl-10 pr-10 py-3 min-h-[44px] rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-tertiary)] transition-all duration-200 focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] backdrop-blur-md"
                {...props}
            />

            {/* Clear button */}
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg-strong)] transition-colors cursor-pointer"
                    aria-label="Clear search"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    )
}
