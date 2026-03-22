import { useEffect, useMemo, useState } from 'react'
import { Radio, History, LogOut, Shield } from 'lucide-react'
import { Link, useMatches, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { getCrewEntryState } from '@/modules/crew/services/route-access'
import { clearAuthSessionCookie } from '@/shared/auth/session-cookie'

export function CrewNav() {
  const matches = useMatches()
  const navigate = useNavigate()
  const currentPath = matches[matches.length - 1]?.fullPath ?? '/crew/live'
  const [showRegisterEntry, setShowRegisterEntry] = useState(currentPath === '/crew/register')

  useEffect(() => {
    let active = true

    void getCrewEntryState()
      .then((access) => {
        if (!active || !access?.allowed) {
          return
        }

        setShowRegisterEntry(access.mappedNganyasCount === 0 && !access.activeSessionId)
      })
      .catch(() => {
        if (!active) {
          return
        }

        setShowRegisterEntry(currentPath === '/crew/register')
      })

    return () => {
      active = false
    }
  }, [currentPath])

  const navItems = useMemo(() => {
    const primaryItem = showRegisterEntry
      ? { to: '/crew/register', label: 'Register', icon: Shield }
      : { to: '/crew/live', label: 'Live', icon: Radio }

    return [
      primaryItem,
      { to: '/crew/history', label: 'History', icon: History },
    ] as const
  }, [showRegisterEntry])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearAuthSessionCookie()
    navigate({ to: '/signin' })
  }

  return (
    <header className="sticky top-0 z-[var(--z-nav)] border-b border-[var(--glass-border)] bg-[var(--color-bg-base)]/85 backdrop-blur-xl">
      <div className="page-container flex h-[var(--top-nav-height)] items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-2">
          <div className="flex items-center gap-2 text-[var(--color-accent)]">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
              MATWANA Crew
            </div>
            <div className="text-caption text-[var(--color-text-tertiary)]">
              Operations
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-2" aria-label="Crew navigation">
          {navItems.map((item) => {
            const isActive = currentPath === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium no-underline transition-all ${
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => {
              void handleSignOut()
            }}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] p-2 text-[var(--color-text-tertiary)] transition-all hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Exit</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
