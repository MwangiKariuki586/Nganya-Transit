import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { clearAuthSessionCookie } from "@/shared/auth/session-cookie";
import type { Session } from "@supabase/supabase-js";
import { getAdminNavLabel } from "@/modules/admin/components/admin-nav-items";
import { useAuthStore } from "@/stores/useAuthStore";
import { ProfileDropdown } from "@/components/navigation/ProfileDropdown";

interface NavProps {
  session: Session | null;
  profile: any;
}

export function AdminNav({ session, profile }: NavProps) {
  const navigate = useNavigate();
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activeLabel = getAdminNavLabel(currentPath);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearAuthSessionCookie();
    useAuthStore.getState().invalidateRole();
    navigate({ to: "/signin", search: {} });
  };

  return (
    <header className="sticky top-0 z-[var(--z-nav)]" role="banner">
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-[var(--glass-border)]" />

      <div className="relative page-container flex h-[var(--top-nav-height)] items-center justify-between gap-4">
        <Link
          to="/admin"
          className="flex items-center gap-3 no-underline group lg:gap-4"
        >
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center shadow-[var(--glow-accent-sm)]">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-base font-bold text-[var(--color-text-primary)] tracking-tight group-hover:text-[var(--color-accent)] transition-colors lg:hidden">
              MATWANA Admin
            </span>
            <div className="hidden lg:block">
              <div className="text-caption text-[var(--color-text-tertiary)]">
                Admin surface
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {activeLabel}
              </div>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            {session && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="w-9 h-9 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all cursor-pointer"
                  aria-label="Open profile menu"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile?.handle || "Admin avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[var(--color-text-tertiary)]">
                      {profile?.handle?.substring(0, 2).toUpperCase() || "AD"}
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <ProfileDropdown
                    profile={profile}
                    profileTo="/profile"
                    onSignOut={handleSignOut}
                    onClose={() => setDropdownOpen(false)}
                    align="right"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
