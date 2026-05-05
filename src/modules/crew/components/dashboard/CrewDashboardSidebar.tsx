/**
 * CrewDashboardSidebar — Left navigation rail for the active session cockpit.
 *
 * Desktop only (hidden on mobile — mobile uses CrewBottomNav).
 * Shows MATWANA Crew identity, crew avatar, and nav items.
 *
 * Navigation contract:
 *   Live     → only session-control entry point
 *   History  → read-only
 *   Notifications → utility only, never creates/resumes a session
 *   Messages → placeholder (not yet implemented)
 *   Profile  → crew profile/settings
 */

import {
  Radio,
  History,
  Bell,
  MessageSquare,
  User,
  Shield,
} from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { useCrewNotificationCount } from "@/modules/crew/hooks/useCrewNotificationCount";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getAvatarInitials } from "@/lib/formatters";

// ─── Component ────────────────────────────────────────────────────────────────

export function CrewDashboardSidebar() {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "";
  const { snapshot } = useCrewBootstrap();
  const unreadCount = useCrewNotificationCount();
  const { profile } = useAuthSession();

  const nganyaName = snapshot.bootstrap.assignment?.nganya_name ?? null;

  const navItems = [
    {
      to: "/crew/live",
      icon: Radio,
      label: "Live",
      badge: null,
      isLive: true,
    },
    {
      to: "/crew/history",
      icon: History,
      label: "History",
      badge: null,
      isLive: false,
    },
    {
      to: "/crew/notifications",
      icon: Bell,
      label: "Alerts",
      badge: unreadCount > 0 ? unreadCount : null,
      isLive: false,
    },
    {
      to: null, // placeholder — not yet implemented
      icon: MessageSquare,
      label: "Messages",
      badge: null,
      isLive: false,
      disabled: true,
    },
    {
      to: "/crew/profile",
      icon: User,
      label: "Profile",
      badge: null,
      isLive: false,
    },
  ] as const;

  return (
    <aside
      className="hidden md:flex flex-col w-[200px] shrink-0 border-r border-(--glass-border) bg-(--color-bg-base)/60 backdrop-blur-sm"
      aria-label="Crew navigation"
    >
      {/* ── Identity block ─────────────────────────────────────────────────── */}
      <div className="px-4 py-5 border-b border-(--glass-border)">
        <Link
          to="/crew/live"
          className="flex items-center gap-2.5 no-underline group"
        >
          <div className="w-7 h-7 rounded-sm bg-(--color-accent) flex items-center justify-center shadow-(--glow-accent-sm) shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-bold text-(--color-text-primary) leading-tight group-hover:text-(--color-accent) transition-colors truncate">
              MATWANA
            </div>
            <div className="text-[10px] text-(--color-text-tertiary) font-medium uppercase tracking-wide">
              Crew
            </div>
          </div>
        </Link>
      </div>

      {/* ── Crew / nganya mini card ─────────────────────────────────────────── */}
      {(profile || nganyaName) && (
        <div className="mx-3 mt-3 rounded-lg border border-(--glass-border) bg-(--glass-bg) p-3">
          {/* Avatar */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-(--color-bg-elevated) border border-(--glass-border) overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.handle ?? "Crew"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-(--color-text-tertiary)">
                  {getAvatarInitials(profile?.handle, "CR")}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-(--color-text-primary) truncate">
                {profile?.handle ?? "Crew"}
              </div>
              {nganyaName && (
                <div className="text-[10px] text-(--color-text-tertiary) truncate">
                  {nganyaName}
                </div>
              )}
            </div>
          </div>

          {/* Live status pill */}
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-(--color-accent) animate-pulse shrink-0"
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold text-(--color-accent) uppercase tracking-wide">
              Live
            </span>
          </div>
        </div>
      )}

      {/* ── Nav items ──────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 px-2 py-3 space-y-0.5"
        aria-label="Primary navigation"
      >
        {navItems.map((item) => {
          const isActive =
            !item.disabled && item.to !== null && currentPath === item.to;

          const Icon = item.icon;

          if (item.disabled || item.to === null) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-(--color-text-tertiary) opacity-40 cursor-not-allowed select-none"
                aria-disabled="true"
                title="Coming soon"
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wide opacity-60">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to as string}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 no-underline ${
                isActive
                  ? "bg-(--color-accent-soft) text-(--color-accent)"
                  : "text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--glass-bg)"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium flex-1">{item.label}</span>

              {/* Badge */}
              {item.badge !== null && item.badge > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-(--color-accent) px-1 text-[9px] font-bold text-white shadow-(--glow-accent-sm)">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}

              {/* Live indicator dot */}
              {item.isLive && isActive && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-(--color-accent) animate-pulse shrink-0"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom spacer / version ─────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-(--glass-border)">
        <div className="text-[10px] text-(--color-text-tertiary) uppercase tracking-wide">
          Operations
        </div>
      </div>
    </aside>
  );
}
