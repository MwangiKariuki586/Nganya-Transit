/**
 * CrewSessionRightRail — Right activity/insights rail for the session cockpit.
 *
 * Desktop only (hidden on mobile — content is stacked in the center column).
 * Contains:
 *   A. Session mini card (nganya name, corridor, live status)
 *   B. Fan-safe aggregated activity (no individual fan data)
 *   C. Latest message preview (placeholder)
 *   D. Alerts / notifications summary
 *
 * Privacy rules:
 *   - No fan names, handles, avatars, or individual locations.
 *   - Only aggregated counts and timestamps.
 */

import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { formatAgeShort } from "@/lib/tracking-signal";
import type { FanInsightsData } from "./FanInsightsCard";
import type { ActiveAlert } from "./AlertsSummaryCard";
import type { LatestMessage } from "./LatestMessageCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrewSessionRightRailProps {
  nganyaName: string;
  corridorName: string;
  isLive: boolean;
  fanData: FanInsightsData | null;
  latestMessage: LatestMessage | null;
  alerts: ActiveAlert[];
  onOpenNotifications?: () => void;
  className?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon
          className="h-3 w-3 shrink-0 text-(--color-text-tertiary)"
          aria-hidden="true"
        />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CrewSessionRightRail({
  nganyaName,
  corridorName,
  isLive,
  fanData,
  latestMessage,
  alerts,
  onOpenNotifications,
  className = "",
}: CrewSessionRightRailProps) {
  const hasAlerts = alerts.length > 0;
  const topAlert = hasAlerts ? alerts[0] : null;
  const topSeverity = hasAlerts
    ? alerts.some((a) => a.severity === "error")
      ? "error"
      : "warn"
    : null;

  const lastActivityLabel = (() => {
    if (!fanData?.lastFanActivityAt) return null;
    const ageSec = Math.floor(
      (Date.now() - new Date(fanData.lastFanActivityAt).getTime()) / 1_000,
    );
    return ageSec >= 0 ? formatAgeShort(ageSec) : null;
  })();

  return (
    <aside
      className={`hidden lg:flex flex-col w-[220px] xl:w-[240px] shrink-0 border-l border-(--glass-border) overflow-y-auto ${className}`}
      aria-label="Session activity"
    >
      <div className="p-3 space-y-3">
        {/* ── A. Session mini card ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-(--color-text-primary) truncate font-display">
                {nganyaName}
              </div>
              <div className="text-[10px] text-(--color-text-secondary) truncate mt-0.5">
                {corridorName}
              </div>
            </div>
            {isLive && (
              <span className="shrink-0 rounded-full border border-(--color-accent)/40 bg-(--color-accent-soft) px-2 py-0.5 text-[9px] font-bold text-(--color-accent) uppercase tracking-wide">
                Live
              </span>
            )}
          </div>

          {/* Live pulse row */}
          {isLive && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-(--glass-border)">
              <span
                className="h-1.5 w-1.5 rounded-full bg-(--color-accent) animate-pulse shrink-0"
                aria-hidden="true"
              />
              <span className="text-[10px] text-(--color-text-tertiary)">
                Broadcasting now
              </span>
            </div>
          )}
        </div>

        {/* ── B. Fan-safe activity ──────────────────────────────────────────── */}
        <RailSection title="Fan activity" icon={Eye}>
          {fanData && fanData.activeTrackers > 0 ? (
            <div className="space-y-2">
              {/* Active trackers */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--color-text-secondary)">
                  Tracking
                </span>
                <span className="text-sm font-bold text-(--color-cyan)">
                  {fanData.activeTrackers}
                </span>
              </div>

              {/* Boarded */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <CheckCircle
                    className="h-3 w-3 text-(--color-success)"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-(--color-text-secondary)">
                    Boarded
                  </span>
                </div>
                <span className="text-sm font-bold text-(--color-success)">
                  {fanData.boardedCount}
                </span>
              </div>

              {/* Missed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <XCircle
                    className="h-3 w-3 text-red-400"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-(--color-text-secondary)">
                    Missed
                  </span>
                </div>
                <span className="text-sm font-bold text-red-400">
                  {fanData.missedCount}
                </span>
              </div>

              {/* Last activity */}
              {lastActivityLabel && (
                <div className="flex items-center gap-1 pt-1.5 border-t border-(--glass-border)">
                  <Clock
                    className="h-3 w-3 text-(--color-text-tertiary)"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-(--color-text-tertiary)">
                    {lastActivityLabel} ago
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-1">
              <p className="text-xs text-(--color-text-tertiary)">
                No fan activity yet
              </p>
              <p className="text-[10px] text-(--color-text-tertiary) mt-0.5 opacity-70">
                Signals appear once fans track this session
              </p>
            </div>
          )}
        </RailSection>

        {/* ── C. Latest message ─────────────────────────────────────────────── */}
        <RailSection title="Messages" icon={MessageSquare}>
          {latestMessage ? (
            <div>
              <p className="text-xs text-(--color-text-primary) line-clamp-2 leading-relaxed">
                {latestMessage.preview}
              </p>
              <p className="mt-1.5 text-[10px] text-(--color-text-tertiary)">
                {latestMessage.timestamp}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-(--color-text-tertiary)">
                No messages yet
              </p>
              <p className="text-[10px] text-(--color-text-tertiary) mt-0.5 opacity-70">
                Messaging coming soon
              </p>
            </div>
          )}
        </RailSection>

        {/* ── D. Alerts summary ─────────────────────────────────────────────── */}
        <div
          className={`rounded-xl border p-3 ${
            hasAlerts && topSeverity === "error"
              ? "border-red-500/30 bg-red-500/10"
              : hasAlerts && topSeverity === "warn"
                ? "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)]"
                : "border-(--glass-border) bg-(--glass-bg)"
          }`}
          role="status"
          aria-label="Alerts summary"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {hasAlerts ? (
                <AlertTriangle
                  className={`h-3 w-3 shrink-0 ${
                    topSeverity === "error"
                      ? "text-red-400"
                      : "text-(--color-warning)"
                  }`}
                  aria-hidden="true"
                />
              ) : (
                <Bell
                  className="h-3 w-3 shrink-0 text-(--color-text-tertiary)"
                  aria-hidden="true"
                />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
                Alerts
              </span>
              {hasAlerts && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${
                    topSeverity === "error"
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] text-(--color-warning)"
                  }`}
                >
                  {alerts.length}
                </span>
              )}
            </div>

            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="text-[10px] text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"
              >
                All
              </button>
            )}
          </div>

          {hasAlerts && topAlert ? (
            <div className="space-y-1">
              <div className="flex items-start gap-1.5">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    topSeverity === "error"
                      ? "bg-red-400"
                      : "bg-(--color-warning)"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-xs font-medium leading-snug ${
                    topSeverity === "error"
                      ? "text-red-300"
                      : "text-(--color-warning)"
                  }`}
                >
                  {topAlert.label}
                </span>
              </div>
              {alerts.length > 1 && (
                <p className="pl-3 text-[10px] text-(--color-text-tertiary)">
                  +{alerts.length - 1} more
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-success)"
                aria-hidden="true"
              />
              <span className="text-xs text-(--color-text-secondary)">
                No alerts
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
