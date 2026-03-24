import { ClipboardList, LayoutGrid, LogOut, UserCog } from 'lucide-react'
import { Link, useMatches } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { clearAuthSessionCookie } from '@/shared/auth/session-cookie'

interface NavProps {
    session: Session | null;
    profile: any;
}

const tabs = [
    { to: '/admin', icon: LayoutGrid, label: 'Overview' },
    { to: '/admin/crew', icon: UserCog, label: 'Crew' },
    { to: '/admin/registrations', icon: ClipboardList, label: 'Queue' },
    { to: '/profile', icon: LogOut, label: 'Sign Out' },
] as const

export default function AdminBottomNav({ session, profile }: NavProps) {
    const matches = useMatches()
    const currentPath = matches[matches.length - 1]?.fullPath ?? '/admin'

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        clearAuthSessionCookie()
        window.location.href = '/signin'
    }

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
            aria-label="Admin navigation"
        >
            {/* Glass background */}
            <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

            {/* Tab bar */}
            <div className="relative grid grid-cols-4 items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
                {tabs.map((tab) => {
                    const isActive = currentPath === tab.to
                    const isSignOut = tab.to === '/profile' && session
                    const targetTo = isSignOut ? '#' : tab.to

                    return (
                        <Link
                            key={tab.to}
                            to={targetTo as any}
                            onClick={isSignOut ? handleSignOut : undefined}
                            className={`flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${isActive
                                ? 'text-[var(--color-accent)]'
                                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                                }`}
                            aria-label={tab.label}
                        >
                            {isSignOut && session ? (
                                <LogOut className="w-5 h-5" />
                            ) : (
                                <tab.icon className="w-5 h-5" />
                            )}
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
