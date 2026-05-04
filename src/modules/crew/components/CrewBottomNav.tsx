/**
 * CrewBottomNav — Mobile-only bottom navigation for the Crew module.
 *
 * Tab order: Live · History/Register · Alerts · Profile(avatar)
 */

import { useState } from "react";
import { Radio, History, Shield, Bell, LogIn } from "lucide-react";
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
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { getCrewStatusState } from "@/modules/crew/services/route-access";
import { useCrewNotificationCount } from "@/modules/crew/hooks/useCrewNotificationCount";

interface NavProps {
  session: Session | null;
  profile: any;
}

export default function CrewBottomNav({ session, profile }: NavProps) {
  const matches = useMatches();
  const navigate = useNavigate();
  const router = useRouter();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/crew/live";
  const { snapshot } = useCrewBootstrap();
  const crewState = getCrewStatusState(snapshot);
  const unreadCount = useCrewNotificationCount();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const showRegisterEntry =
    crewState === "UNREGISTERED" ||
    crewState === "PENDING_APPROVAL" ||
    crewState === "NEEDS_INFO" ||
    crewState === "REJECTED";

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

  const primaryTabs = [
    {
      to: "/crew/live",
      icon: Radio,
      label: "Live",
    },
    {
      to: showRegisterEntry ? "/crew/register" : "/crew/history",
      icon: showRegisterEntry ? Shield : History,
      label: showRegisterEntry ? "Register" : "History",
    },
  ] as const;

  const alertsTo = session ? "/crew/notifications" : "/signin";
  const isAlertsActive = currentPath === "/crew/notifications";
  const profileTo = session ? "/crew/profile" : "/signin";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
      aria-label="Crew navigation"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

      {/* Tab bar — Live · History/Register · Alerts · Profile */}
      <div className="relative flex items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
        {/* Live + History/Register tabs */}
        {primaryTabs.map((tab) => {
          const isActive = currentPath === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to as any}
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

        {/* Alerts bell — flex-1 tab with label */}
        <Link
          to={alertsTo as any}
          className={`relative flex flex-1 flex-col items-center justify-center gap-1 h-12 rounded-md transition-colors duration-150 no-underline ${
            isAlertsActive
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
          aria-label={
            unreadCount > 0 ? `Alerts (${unreadCount} unread)` : "Alerts"
          }
        >
          <span className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium">Alerts</span>
        </Link>

        {/* Profile tab — avatar with dropdown */}
        <div className="relative flex flex-col items-center justify-center flex-1">
          {session ? (
            <>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className={`relative flex flex-col items-center justify-center w-full h-12 rounded-md transition-colors duration-150 cursor-pointer ${
                  currentPath === "/crew/profile"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                }`}
                aria-label="Open profile menu"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 ${
                    currentPath === "/crew/profile"
                      ? "border-[var(--color-accent)] shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.5)]"
                      : "border-[var(--glass-border)]"
                  }`}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--glass-bg)] flex items-center justify-center text-[9px] font-bold">
                      {profile?.handle?.substring(0, 2).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </button>

              {dropdownOpen && (
                <ProfileDropdown
                  profile={profile}
                  profileTo={profileTo}
                  onSignOut={handleSignOut}
                  onClose={() => setDropdownOpen(false)}
                  align="right"
                  upward
                />
              )}
            </>
          ) : (
            <Link
              to={"/signin" as any}
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
