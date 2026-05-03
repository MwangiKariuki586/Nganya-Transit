import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearAuthSessionCookie } from "@/shared/auth/session-cookie";
import { adminNavItems } from "@/modules/admin/components/admin-nav-items";
import { useAuthStore } from "@/stores/useAuthStore";
import { ProfileDropdown } from "@/components/navigation/ProfileDropdown";

interface AdminSidebarProps {
  session: Session | null;
  profile: any;
}

export function AdminSidebar({ session, profile }: AdminSidebarProps) {
  const navigate = useNavigate();
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearAuthSessionCookie();
    useAuthStore.getState().invalidateRole();
    navigate({ to: "/signin", search: {} });
  };

  return (
    <aside className="hidden lg:flex lg:w-[280px] lg:flex-col lg:border-r lg:border-[var(--glass-border)] lg:bg-[rgba(12,12,18,0.9)] lg:backdrop-blur-xl">
      <div className="sticky top-0 flex h-screen flex-col px-5 py-6">
        <Link to="/admin" className="flex items-center gap-3 no-underline">
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-[var(--glow-accent-sm)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-white">
              MATWANA Admin
            </div>
            <div className="text-caption text-[var(--color-text-tertiary)]">
              Operations console
            </div>
          </div>
        </Link>

        <nav className="mt-8 space-y-2" aria-label="Admin sidebar navigation">
          {adminNavItems.map((item) => {
            const isActive = currentPath === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-[18px] px-4 py-3 no-underline transition-all ${
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-white shadow-[var(--glow-accent-sm)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
                }`}
              >
                <item.icon
                  className={`h-4.5 w-4.5 ${isActive ? "text-[var(--color-accent)]" : ""}`}
                />
                <div className="text-sm font-semibold">{item.label}</div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[24px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--glass-border-hover)] transition-all cursor-pointer"
              aria-label="Open profile menu"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile?.handle || "Admin avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-[var(--color-text-tertiary)]">
                  {profile?.handle?.substring(0, 2).toUpperCase() || "AD"}
                </span>
              )}
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {profile?.full_name || "Admin account"}
              </div>
              <div className="truncate text-caption text-[var(--color-text-tertiary)]">
                @{profile?.handle || session?.user?.email || "admin"}
              </div>
            </div>

            {dropdownOpen && (
              <ProfileDropdown
                profile={profile}
                profileTo="/profile"
                onSignOut={handleSignOut}
                onClose={() => setDropdownOpen(false)}
                align="left"
                upward
              />
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
