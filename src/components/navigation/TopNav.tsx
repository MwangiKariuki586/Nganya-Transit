/**
 * TopNav — Desktop top navigation bar.
 * MATWANA logo | Discover | Following | Spot | Profile
 * Glass header with backdrop blur.
 */

import { Compass, Heart, Camera, Zap, LogOut } from "lucide-react";
import { Link, useMatches, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { clearAuthSessionCookie } from "@/shared/auth/session-cookie";
import { useAuthStore } from "@/stores/useAuthStore";

interface NavProps {
  session: Session | null;
  profile: any;
}

const navItems = [
  { to: "/", icon: Compass, label: "Discover" },
  { to: "/following", icon: Heart, label: "Following" },
  { to: "/spot", icon: Camera, label: "Spot" },
  // { to: '/profile', icon: User, label: 'Profile' },
] as const;

export default function TopNav({ session, profile }: NavProps) {
  const matches = useMatches();
  const navigate = useNavigate();
  const router = useRouter();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearAuthSessionCookie();
    useAuthStore.getState().invalidateRole();
    await router.invalidate();
    navigate({ to: "/", replace: true });
  };

  return (
    <header
      className="hidden md:block sticky top-0 left-0 right-0 z-[var(--z-nav)]"
      role="banner"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-[var(--glass-border)]" />

      <div className="relative page-container flex items-center justify-between h-[var(--top-nav-height)]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline group">
          <div className="w-8 h-8 rounded-sm bg-[var(--color-accent)] flex items-center justify-center shadow-[var(--glow-accent-sm)]">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-[var(--color-text-primary)] tracking-tight group-hover:text-[var(--color-accent)] transition-colors">
            MATWANA
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.to ||
              (item.to === "/" && currentPath === "/discover");
            const isSpot = item.to === "/spot";

            if (isSpot) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm font-semibold shadow-[var(--glow-accent-sm)] hover:shadow-[var(--glow-accent)] hover:bg-[var(--color-accent-hover)] transition-all duration-150 no-underline"
                >
                  <Camera className="w-4 h-4" />
                  Spot
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 no-underline ${
                  isActive
                    ? "text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Auth Status */}
          <div className="ml-4 pl-4 border-l border-[var(--glass-border)] flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 p-1 pr-3 rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all no-underline group"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden border border-[var(--glass-border)]">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.handle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[var(--color-text-tertiary)] bg-gradient-to-br from-[var(--glass-bg)] to-transparent">
                        {profile?.handle?.substring(0, 2).toUpperCase() || "??"}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                    @{profile?.handle || "user"}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-red-500/10 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/signin"
                  className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all no-underline"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--glass-bg-strong)] border border-[var(--glass-border-hover)] text-white text-sm font-bold hover:bg-[var(--color-accent)] hover:border-transparent transition-all shadow-[var(--shadow-sm)] no-underline"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
