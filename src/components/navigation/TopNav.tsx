/**
 * TopNav — Desktop top navigation bar.
 * MATWANA logo | Discover | Following | Spot | Profile
 * Glass header with backdrop blur.
 */

import { Compass, Heart, Camera, User, Zap } from 'lucide-react'
import { Link, useMatches } from '@tanstack/react-router'

const navItems = [
    { to: '/', icon: Compass, label: 'Discover' },
    { to: '/following', icon: Heart, label: 'Following' },
    { to: '/spot', icon: Camera, label: 'Spot' },
    { to: '/profile', icon: User, label: 'Profile' },
] as const

export default function TopNav() {
    const matches = useMatches()
    const currentPath = matches[matches.length - 1]?.fullPath ?? '/'

    return (
        <header
            className="hidden md:block fixed top-0 left-0 right-0 z-[var(--z-nav)]"
            role="banner"
        >
            {/* Glass background */}
            <div className="absolute inset-0 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-[var(--glass-border)]" />

            <div className="relative page-container flex items-center justify-between h-[var(--top-nav-height)]">
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2 no-underline group"
                >
                    <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center shadow-[var(--glow-accent-sm)]">
                        <Zap className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="font-display text-lg font-bold text-[var(--color-text-primary)] tracking-tight group-hover:text-[var(--color-accent)] transition-colors">
                        MATWANA
                    </span>
                </Link>

                {/* Nav links */}
                <nav className="flex items-center gap-1" aria-label="Main navigation">
                    {navItems.map((item) => {
                        const isActive = currentPath === item.to || (item.to === '/' && currentPath === '/discover')
                        const isSpot = item.to === '/spot'

                        if (isSpot) {
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-semibold shadow-[var(--glow-accent-sm)] hover:shadow-[var(--glow-accent)] hover:bg-[var(--color-accent-hover)] transition-all duration-150 no-underline"
                                >
                                    <Camera className="w-4 h-4" />
                                    Spot
                                </Link>
                            )
                        }

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 no-underline ${isActive
                                        ? 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)]'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </header>
    )
}
