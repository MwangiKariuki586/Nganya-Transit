import { Radio, History, Shield, User, Bell } from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { getCrewStatusState } from "@/modules/crew/services/route-access";
import { useCrewNotificationCount } from "@/modules/crew/hooks/useCrewNotificationCount";

interface NavProps {
  session: Session | null;
  profile: any;
}

export default function CrewBottomNav({ session, profile }: NavProps) {
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

  const tabs = [
    { to: "/crew/live", icon: Radio, label: "Live", bell: false },
    {
      to: showRegisterEntry ? "/crew/register" : "/crew/history",
      icon: showRegisterEntry ? Shield : History,
      label: showRegisterEntry ? "Register" : "History",
      bell: false,
    },
    {
      to: session ? "/crew/notifications" : "/signin",
      icon: Bell,
      label: "Alerts",
      bell: true,
    },
    {
      to: session ? "/crew/profile" : "/signin",
      icon: User,
      label: session ? "Profile" : "Sign In",
      bell: false,
    },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden"
      aria-label="Crew navigation"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

      {/* Tab bar */}
      <div className="relative grid grid-cols-4 items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.to;
          const showBadge = tab.bell && unreadCount > 0;

          return (
            <Link
              key={tab.to}
              to={tab.to as any}
              className={`relative flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
              aria-label={showBadge ? `${tab.label} (${unreadCount} unread)` : tab.label}
            >
              <span className="relative">
                <tab.icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
