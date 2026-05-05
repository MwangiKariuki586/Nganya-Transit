import { useState } from "react";
import { Home, Search, Camera, LogIn, Bell } from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useSignOut } from "@/hooks/useSignOut";
import { getAvatarInitials } from "@/lib/formatters";
import { ProfileDropdown } from "@/components/navigation/ProfileDropdown";

interface NavProps {
  session: Session | null;
  profile: any;
}

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/discover", icon: Search, label: "Explore" },
  { to: "/spot", icon: Camera, label: "Spot" },
] as const;

export default function BottomNav({ session, profile }: NavProps) {
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

      <div className="relative flex items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
        {/* Primary tabs — Home, Explore, Spot */}
        {tabs.map((tab) => {
          const isActive = currentPath === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 h-12 rounded-md transition-colors duration-150 no-underline ${
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
              aria-label={tab.label}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* Profile tab — last, avatar sized to match icon+label height */}
        <div className="relative flex flex-col items-center justify-center flex-1">
          {session ? (
            <>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className={`relative flex flex-col items-center justify-center w-full h-12 rounded-md transition-colors duration-150 cursor-pointer ${
                  currentPath === "/profile"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                }`}
                aria-label="Open profile menu"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 ${currentPath === "/profile" ? "border-[var(--color-accent)] shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.5)]" : "border-[var(--glass-border)]"}`}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--glass-bg)] flex items-center justify-center text-[9px] font-bold">
                      {getAvatarInitials(profile?.handle, "U")}
                    </div>
                  )}
                </div>
              </button>

              {dropdownOpen && (
                <ProfileDropdown
                  profile={profile}
                  profileTo="/profile"
                  onSignOut={handleSignOut}
                  onClose={() => setDropdownOpen(false)}
                  align="right"
                  upward
                />
              )}
            </>
          ) : (
            <Link
              to="/signin"
              className="relative flex flex-col items-center justify-center w-full h-12 rounded-md transition-colors duration-150 no-underline text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              aria-label="Sign In"
            >
              <LogIn className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
