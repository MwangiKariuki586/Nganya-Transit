/**
 * AppShell — Responsive layout wrapper.
 * Renders BottomNav on mobile, TopNav on desktop.
 * Manages content area padding for fixed navigation.
 */

import type { ReactNode } from 'react'
import BottomNav from '../navigation/BottomNav'
import TopNav from '../navigation/TopNav'
import { ToastProvider } from '../ui/Toast'

interface AppShellProps {
    children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
    return (
        <ToastProvider>
            <div className="min-h-screen flex flex-col">
                {/* Desktop top nav — hidden on mobile */}
                <TopNav />

                {/* Main content — padded for fixed navs */}
                <main className="flex-1 pt-0 md:pt-[var(--top-nav-height)] pb-[var(--bottom-nav-height)] md:pb-0">
                    {children}
                </main>

                {/* Mobile bottom nav — hidden on desktop */}
                <BottomNav />
            </div>
        </ToastProvider>
    )
}
