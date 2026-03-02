/**
 * BottomNav — Mobile bottom tab bar.
 * Tabs: Discover | Following | [FAB Spot] | Profile.
 * Glass background, active state with neon accent, safe area aware.
 */

import { Compass, Search, Heart, User } from 'lucide-react'
import { Link, useMatches } from '@tanstack/react-router'
import FAB from '../ui/FAB'

/* Tab configuration */
const tabs = [
    { to: '/', icon: Compass, label: 'Feed' },
    { to: '/discover', icon: Search, label: 'Discover' },
    // FAB goes here (center)
    { to: '/following', icon: Heart, label: 'Following' },
    { to: '/profile', icon: User, label: 'Profile' },
] as const

export default function BottomNav() {
    const matches = useMatches()
    const currentPath = matches[matches.length - 1]?.fullPath ?? '/'

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
            aria-label="Main navigation"
        >
            {/* Glass background */}
            <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

            {/* Tab bar */}
            <div className="relative grid grid-cols-5 items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
                {/* Left side tabs */}
                {tabs.slice(0, 2).map((tab) => {
                    const isActive = currentPath === tab.to
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={`flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${isActive
                                ? 'text-[var(--color-accent)]'
                                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                                }`}
                            aria-label={tab.label}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </Link>
                    )
                })}

                {/* Center FAB */}
                <div className="flex justify-center -mt-6">
                    <FAB />
                </div>

                {/* Right side tabs */}
                {tabs.slice(2).map((tab) => {
                    const isActive = currentPath === tab.to
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={`flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${isActive
                                ? 'text-[var(--color-accent)]'
                                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                                }`}
                            aria-label={tab.label}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
