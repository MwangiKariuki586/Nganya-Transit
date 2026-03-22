/**
 * AppShell - Responsive layout wrapper.
 * Renders BottomNav on mobile, TopNav on desktop.
 * Manages content area padding for fixed navigation.
 */

import type { ReactNode } from 'react'
import { useMatches } from '@tanstack/react-router'
import BottomNav from '../navigation/BottomNav'
import TopNav from '../navigation/TopNav'
import { ToastProvider } from '../ui/Toast'

interface AppShellProps {
    children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
    const matches = useMatches()
    const currentPath = matches[matches.length - 1]?.fullPath ?? '/'
    const useRoleShell = currentPath.startsWith('/crew') || currentPath.startsWith('/admin')

    return (
        <ToastProvider>
            <div className="min-h-screen flex flex-col">
                {!useRoleShell ? <TopNav /> : null}

                <main className={`flex-1 ${useRoleShell ? 'pt-0 pb-0' : 'pt-0 md:pt-[var(--top-nav-height)] pb-[var(--bottom-nav-height)] md:pb-0'}`}>
                    {children}
                </main>

                {!useRoleShell ? <BottomNav /> : null}
            </div>
        </ToastProvider>
    )
}
