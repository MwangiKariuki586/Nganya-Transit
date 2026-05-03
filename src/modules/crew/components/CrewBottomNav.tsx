/**
 * CrewBottomNav — Mobile-only bottom navigation for the Crew module.
 *
 * Navigation contract (spec §09):
 *   Live     → only place to start/resume live tracking
 *   History  → read-only session history (or Register when unregistered)
 *   Alerts   → notifications utility icon (badge only, not a primary tab)
 *   Profile  → crew profile/settings
 *
 * Three primary tabs: Live · History/Register · Profile
 * Alerts is surfaced as a badge icon inside the Profile tab area so it
 * remains accessible without occupying a primary tab slot.
 *
 * This matches the desktop CrewNav which shows Live + History as nav links
 * and Alerts as a secondary bell icon in the auth section.
 */

import { Radio, History, Shield, User, Bell } from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { getCrewStatusState } from "@/modules/crew/services/route-access";
import { useCrewNotificationCount } from "@/modules/crew/hooks/useCrewNotificationCount";

interface NavProps {
  session: Session | null;
}

export default function CrewBottomNav({ session }: NavProps) {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/crew/live";
  const { snapshot } = useCrewBootstrap();
  const crewState = getCrewStatusState(snapshot);
  const unreadCount = useCrewNotificationCount();

  const showRegisterEntry =
    crewState === "UNREGISTERED" ||
    crewState === "PENDING_APPROVAL" ||
    crewState === "NEEDS_INFO" ||
    crewState === "REJECTED";

  // Three primary tabs — Live, History/Register, Profile.
  // Alerts/Notifications is a secondary bell icon on the Profile tab,
  // consistent with how the desktop nav treats it.
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
    {
      to: session ? "/crew/profile" : "/signin",
      icon: User,
      label: session ? "Profile" : "Sign In",
    },
  ] as const;

  // Alerts route — shown as a secondary bell icon alongside the Profile tab
  const alertsTo = session ? "/crew/notifications" : "/signin";
  const isAlertsActive = currentPath === "/crew/notifications";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
      aria-label="Crew navigation"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

      {/* Tab bar — 3 primary tabs + alerts bell */}
      <div className="relative flex items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
        {/* Primary tabs — equal width, fill available space */}
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

        {/* Alerts bell — secondary utility icon, not a primary tab */}
        <Link
          to={alertsTo as any}
          className={`relative flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-md transition-colors duration-150 no-underline shrink-0 ${
            isAlertsActive
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
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
          {/* No label — keeps it visually secondary */}
        </Link>
      </div>
    </nav>
  );
}
