/**
 * BottomNav — Mobile bottom tab bar.
 * Tabs: Discover | Following | [FAB Spot] | Profile.
 * Glass background, active state with neon accent, safe area aware.
 */

import { Compass, Heart, User } from 'lucide-react'
import { Link, useMatches } from '@tanstack/react-router'
import FAB from '../ui/FAB'

/* Tab configuration */
const tabs = [
    { to: '/', icon: Compass, label: 'Discover' },
    { to: '/following', icon: Heart, label: 'Following' },
    // FAB goes here (center)
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
            <div className="relative flex items-center justify-around px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
                {/* First two tabs */}
                {tabs.slice(0, 2).map((tab) => {
                    const isActive = currentPath === tab.to || (tab.to === '/' && currentPath === '/discover')
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${isActive
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
                <div className="relative -mt-5">
                    <FAB />
                </div>

                {/* Last tab */}
                {tabs.slice(2).map((tab) => {
                    const isActive = currentPath === tab.to
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${isActive
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
