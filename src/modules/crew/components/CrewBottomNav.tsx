import { Radio, History, Shield, LogOut, LogIn } from 'lucide-react'
import { Link, useMatches } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { useCrewBootstrap } from '@/modules/crew/context/CrewBootstrapContext'
import { getCrewStatusState } from '@/modules/crew/services/route-access'
import { clearAuthSessionCookie } from '@/shared/auth/session-cookie'
import { clearCrewBootstrapCache } from '@/modules/crew/services/bootstrap-cache'

interface NavProps {
  session: Session | null;
  profile: any;
}

export default function CrewBottomNav({ session, profile }: NavProps) {
    const matches = useMatches()
    const currentPath = matches[matches.length - 1]?.fullPath ?? '/crew/live'
    const { snapshot } = useCrewBootstrap()
    const crewState = getCrewStatusState(snapshot)

    const showRegisterEntry =
        crewState === "UNREGISTERED" ||
        crewState === "PENDING_APPROVAL" ||
        crewState === "NEEDS_INFO" ||
        crewState === "REJECTED";

    const tabs = [
        { to: '/crew/live', icon: Radio, label: 'Live' },
        { to: showRegisterEntry ? '/crew/register' : '/crew/live', icon: showRegisterEntry ? Shield : History, label: showRegisterEntry ? 'Register' : 'History' },
        { to: '/profile', icon: session ? LogOut : LogIn, label: session ? 'Sign Out' : 'Profile' },
    ] as const

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        clearAuthSessionCookie()
        clearCrewBootstrapCache(snapshot.userId)
        window.location.href = '/signin'
    }

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
            aria-label="Crew navigation"
        >
            {/* Glass background */}
            <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

            {/* Tab bar */}
            <div className="relative grid grid-cols-3 items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
                {tabs.map((tab, index) => {
                    const isActive = currentPath === tab.to || (tab.to === '/crew/live' && currentPath === '/crew/live')
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
