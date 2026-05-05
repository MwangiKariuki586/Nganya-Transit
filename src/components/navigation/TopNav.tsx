/**
 * TopNav — Desktop top navigation bar.
 * MATWANA logo | Discover | Following | Spot | Profile
 * Glass header with backdrop blur.
 */

import { useState } from "react";
import { Home, Search, Camera, Zap } from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useSignOut } from "@/hooks/useSignOut";
import { getAvatarInitials } from "@/lib/formatters";
import { ProfileDropdown } from "@/components/navigation/ProfileDropdown";

interface NavProps {
  session: Session | null;
  profile: any;
}

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/discover", icon: Search, label: "Explore" },
  // { to: "/following", icon: Heart, label: "Following" },
  { to: "/spot", icon: Camera, label: "Spot" },
] as const;

export default function TopNav({ session, profile }: NavProps) {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/";
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = useSignOut({
    redirectTo: "/",
    clearSearch: {
      q: undefined,
      corridor: undefined,
      vibe: undefined,
      recent: undefined,
    },
  });

  return (
    <header
      className="hidden md:block sticky top-0 left-0 right-0 z-[var(--z-nav)]"
      role="banner"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-[var(--glass-border)]" />

      <div className="relative page-container flex items-center justify-between h-[var(--top-nav-height)]">
        {/* Logo */}
        <Link
          to="/"
          search={{
            q: undefined,
            corridor: undefined,
            vibe: undefined,
            recent: undefined,
          }}
          className="flex items-center gap-2 no-underline group"
        >
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
            const isActive = currentPath === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-all duration-150 no-underline ${
                  isActive
                    ? "text-[var(--color-accent)] border-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all cursor-pointer"
                  aria-label="Open profile menu"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.handle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[var(--color-text-tertiary)] bg-gradient-to-br from-[var(--glass-bg)] to-transparent">
                      {getAvatarInitials(profile?.handle)}
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
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/signin"
                  search={{} as any}
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
