/**
 * FAB — Floating Action Button for "Spot" action.
 * Center neon magenta button in mobile bottom nav.
 * Glow ring, ≥56px touch target, accessible.
 */

import { Camera } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface FABProps {
    className?: string
}

export default function FAB({ className = '' }: FABProps) {
    return (
        <Link
            to="/spot"
            className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--glow-accent)] animate-glow-pulse transition-transform duration-150 active:scale-90 no-underline ${className}`}
            aria-label="Spot a nganya"
        >
            <Camera className="w-6 h-6" />
        </Link>
    )
}
