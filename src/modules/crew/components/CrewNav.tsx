import { useMemo, useState } from "react";
import { Radio, History, Shield, Bell } from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { getCrewStatusState } from "@/modules/crew/services/route-access";
import { useCrewNotificationCount } from "@/modules/crew/hooks/useCrewNotificationCount";
import { stopCrewSessionServerFn } from "@/shared/server-fns/crew-live";
import {
  clearCrewActiveSessionId,
  clearSessionState,
} from "@/modules/crew/lib/session-storage";
import type { Session } from "@supabase/supabase-js";
import { useSignOut } from "@/hooks/useSignOut";
import { getAvatarInitials } from "@/lib/formatters";
import { ProfileDropdown } from "@/components/navigation/ProfileDropdown";

interface NavProps {
  session: Session | null;
  profile: any;
}

export function CrewNav({ session, profile }: NavProps) {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/crew/live";
  const { snapshot } = useCrewBootstrap();
  const crewState = getCrewStatusState(snapshot);
  const unreadCount = useCrewNotificationCount();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const baseSignOut = useSignOut({ redirectTo: "/signin" });

  const showRegisterEntry =
    crewState === "UNREGISTERED" ||
    crewState === "PENDING_APPROVAL" ||
    crewState === "NEEDS_INFO" ||
    crewState === "REJECTED";

  const navItems = useMemo(() => {
    const primaryItem = showRegisterEntry
      ? { to: "/crew/register", label: "Register", icon: Shield }
      : { to: "/crew/live", label: "Live", icon: Radio };

    return [
      primaryItem,
      { to: "/crew/history", label: "History", icon: History },
    ] as const;
  }, [showRegisterEntry]);

  const handleSignOut = async () => {
    // Capture the token NOW before any auth state changes.
    // We pass it directly to the server function so the stop call
    // cannot race with supabase.auth.signOut() clearing the session.
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const accessToken = currentSession?.access_token ?? null;

    const activeSessionId = snapshot.bootstrap.active_session?.id;
    if (activeSessionId && accessToken) {
      try {
        await stopCrewSessionServerFn({
          data: { accessToken, sessionId: activeSessionId },
        });
      } catch {
        // Non-fatal — sign-out proceeds regardless.
        // The DB-level expiry guard in crew_bootstrap prevents
        // the stale session from appearing on next login.
      }
      clearCrewActiveSessionId();
      clearSessionState();
    }

    // Delegate the rest of the sign-out flow to the shared hook.
    await baseSignOut();
  };

  return (
    <header
      className="hidden md:block sticky top-0 z-[var(--z-nav)]"
      role="banner"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-[var(--glass-border)]" />

      <div className="relative page-container flex items-center justify-between h-[var(--top-nav-height)]">
        {/* Logo */}
        <Link
          to="/crew/live"
          className="flex items-center gap-2 no-underline group"
        >
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center shadow-[var(--glow-accent-sm)]">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-lg font-bold text-[var(--color-text-primary)] tracking-tight group-hover:text-[var(--color-accent)] transition-colors">
              NGANYA TRANSIT
            </span>
            <div className="text-caption text-[var(--color-text-tertiary)]">
              Operations
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1" aria-label="Crew navigation">
          {navItems.map((item) => {
            const isActive = currentPath === item.to;
            const isRegister = item.to === "/crew/register";

            if (isRegister && showRegisterEntry) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-sm font-semibold shadow-[var(--glow-accent-sm)] hover:shadow-[var(--glow-accent)] hover:bg-[var(--color-accent-hover)] transition-all duration-150 no-underline"
                >
                  <Shield className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 no-underline ${
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
                {/* Notification bell */}
                <Link
                  to="/crew/notifications"
                  className="relative p-2 rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-all no-underline"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[9px] font-bold text-[var(--color-accent-foreground)] shadow-[var(--glow-accent-sm)]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Avatar button with dropdown */}
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
                      profileTo="/crew/profile"
                      onSignOut={handleSignOut}
                      onClose={() => setDropdownOpen(false)}
                      align="right"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/signin"
                  className="inline-flex items-center px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all no-underline"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-4 py-2 rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border-hover)] text-white text-sm font-bold hover:bg-[var(--color-accent)] hover:border-transparent transition-all shadow-[var(--shadow-sm)] no-underline"
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
