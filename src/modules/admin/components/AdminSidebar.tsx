import { LogOut, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearAuthSessionCookie } from '@/shared/auth/session-cookie'
import { adminNavItems } from '@/modules/admin/components/admin-nav-items'

interface AdminSidebarProps {
  session: Session | null
  profile: any
}

export function AdminSidebar({ session, profile }: AdminSidebarProps) {
  const navigate = useNavigate()
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearAuthSessionCookie()
    navigate({ to: '/signin', search: {} })
  }

  return (
    <aside className="hidden lg:flex lg:w-[280px] lg:flex-col lg:border-r lg:border-[var(--glass-border)] lg:bg-[rgba(12,12,18,0.9)] lg:backdrop-blur-xl">
      <div className="sticky top-0 flex h-screen flex-col px-5 py-6">
        <Link to="/admin" className="flex items-center gap-3 no-underline">
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-[var(--glow-accent-sm)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-white">MATWANA Admin</div>
            <div className="text-caption text-[var(--color-text-tertiary)]">Operations console</div>
          </div>
        </Link>

        <nav className="mt-8 space-y-2" aria-label="Admin sidebar navigation">
          {adminNavItems.map((item) => {
            const isActive = currentPath === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-[18px] px-4 py-3 no-underline transition-all ${
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-white shadow-[var(--glow-accent-sm)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-[var(--color-accent)]' : ''}`} />
                <div className="text-sm font-semibold">{item.label}</div>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto rounded-[24px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-elevated)]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.handle || 'Admin avatar'} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-[var(--color-text-tertiary)]">
                  {profile?.handle?.substring(0, 2).toUpperCase() || 'AD'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {profile?.full_name || 'Admin account'}
              </div>
              <div className="truncate text-caption text-[var(--color-text-tertiary)]">
                @{profile?.handle || session?.user?.email || 'admin'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
