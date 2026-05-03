import { useState } from "react";
import { Home, Search, Camera, LogIn } from "lucide-react";
import {
  Link,
  useMatches,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearAuthSessionCookie } from "@/shared/auth/session-cookie";
import { useAuthStore } from "@/stores/useAuthStore";
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
  const navigate = useNavigate();
  const router = useRouter();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/";
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearAuthSessionCookie();
    useAuthStore.getState().invalidateRole();
    await router.invalidate();
    navigate({
      to: "/",
      search: {
        q: undefined,
        corridor: undefined,
        vibe: undefined,
        recent: undefined,
      },
      replace: true,
    });
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
      aria-label="Main navigation"
    >
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

      <div className="relative grid grid-cols-4 w-full items-center h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${
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

        {/* Profile tab */}
        <div className="relative flex flex-col items-center justify-center w-full">
          {session ? (
            <>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className={`flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 cursor-pointer ${
                  currentPath === "/profile"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                }`}
                aria-label="Open profile menu"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div
                  className={`w-5 h-5 rounded-full overflow-hidden border ${currentPath === "/profile" ? "border-[var(--color-accent)] shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.5)]" : "border-[var(--glass-border)]"}`}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--glass-bg)] flex items-center justify-center text-[8px] font-bold">
                      {profile?.handle?.substring(0, 2).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium">Profile</span>
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
              className="flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              aria-label="Sign In"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-[10px] font-medium">Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
