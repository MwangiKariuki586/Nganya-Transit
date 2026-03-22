import { ClipboardList, LayoutGrid, LogOut, ShieldCheck } from 'lucide-react'
import { Link, useMatches, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { clearAuthSessionCookie } from '@/shared/auth/session-cookie'

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid },
  { to: '/admin/registrations', label: 'Registrations', icon: ClipboardList },
] as const

export function AdminNav() {
  const matches = useMatches()
  const navigate = useNavigate()
  const currentPath = matches[matches.length - 1]?.fullPath ?? '/admin'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearAuthSessionCookie()
    navigate({ to: '/signin' })
  }

  return (
    <header className="sticky top-0 z-[var(--z-nav)] border-b border-[var(--glass-border)] bg-[var(--color-bg-base)]/85 backdrop-blur-xl">
      <div className="page-container flex h-[var(--top-nav-height)] items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
          <div>
            <div className="font-display text-lg font-bold tracking-tight">MATWANA Admin</div>
            <div className="text-caption text-[var(--color-text-tertiary)]">Review and moderation</div>
          </div>
        </div>

        <nav className="flex items-center gap-2" aria-label="Admin navigation">
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
            onClick={() => { void handleSignOut() }}
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
