import { Home, Search, Camera, User, LogIn } from 'lucide-react'
import { Link, useMatches } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'

interface NavProps {
    session: Session | null;
    profile: any;
}

const tabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/discover', icon: Search, label: 'Explore' },
    { to: '/spot', icon: Camera, label: 'Spot' },
    { to: '/profile', icon: User, label: 'Profile' },
] as const

export default function BottomNav({ session, profile }: NavProps) {
    const matches = useMatches()
    const currentPath = matches[matches.length - 1]?.fullPath ?? '/'

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
            aria-label="Main navigation"
        >
            <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

            <div className="relative grid grid-cols-4 w-full items-center h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
                {tabs.map((tab) => {
                    const isActive = currentPath === tab.to
                    const isProfile = tab.to === '/profile'
                    const targetTo = isProfile && !session ? '/signin' : tab.to

                    return (
                        <Link
                            key={tab.to}
                            to={targetTo as any}
                            className={`flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${
                                isActive
                                    ? 'text-[var(--color-accent)]'
                                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                            }`}
                            aria-label={tab.label}
                        >
                            {isProfile && session ? (
                                <div className={`w-5 h-5 rounded-full overflow-hidden border ${isActive ? 'border-[var(--color-accent)] shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.5)]' : 'border-[var(--glass-border)]'}`}>
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-[var(--glass-bg)] flex items-center justify-center text-[8px] font-bold">
                                            {profile?.handle?.substring(0, 2).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                            ) : isProfile && !session ? (
                                <LogIn className="w-5 h-5" />
                            ) : (
                                <tab.icon className="w-5 h-5" />
                            )}
                            <span className="text-[10px] font-medium">
                                {isProfile && !session ? 'Sign In' : tab.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
