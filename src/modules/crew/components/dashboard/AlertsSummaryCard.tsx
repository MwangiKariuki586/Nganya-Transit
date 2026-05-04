/**
 * AlertsSummaryCard — Compact alert/notification summary card.
 *
 * Replaces the old full-width inline warning blocks with a compact card
 * that shows the count and highest-severity issue.
 * Purely presentational — no hooks, no data fetching.
 */

import { Bell } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = "error" | "warn" | "info";

export interface ActiveAlert {
  label: string;
  severity: AlertSeverity;
}

export interface AlertsSummaryCardProps {
  alerts: ActiveAlert[];
  onOpenNotifications?: () => void;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { dot: string; text: string; badge: string }
> = {
  error: {
    dot: "bg-red-400",
    text: "text-red-300",
    badge: "border-red-500/30 bg-red-500/10 text-red-300",
  },
  warn: {
    dot: "bg-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
    badge:
      "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] text-[var(--color-warning)]",
  },
  info: {
    dot: "bg-(--color-text-tertiary)",
    text: "text-(--color-text-secondary)",
    badge:
      "border-(--glass-border) bg-(--glass-bg) text-(--color-text-secondary)",
  },
};

function highestSeverity(alerts: ActiveAlert[]): AlertSeverity {
  if (alerts.some((a) => a.severity === "error")) return "error";
  if (alerts.some((a) => a.severity === "warn")) return "warn";
  return "info";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertsSummaryCard({
  alerts,
  onOpenNotifications,
  className = "",
}: AlertsSummaryCardProps) {
  const hasAlerts = alerts.length > 0;
  const topSeverity = hasAlerts ? highestSeverity(alerts) : null;
  const topAlert = hasAlerts ? alerts[0] : null;
  const styles = topSeverity ? SEVERITY_STYLES[topSeverity] : null;

  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 ${className}`}
      role="status"
      aria-label="Alerts summary"
    >
      {/* Card header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell
            className="h-3.5 w-3.5 shrink-0 text-(--color-text-tertiary)"
            aria-hidden="true"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
            Alerts
          </span>
          {hasAlerts && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${styles!.badge} border`}
            >
              {alerts.length}
            </span>
          )}
        </div>

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="text-xs font-medium text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"
          >
            View all
          </button>
        )}
      </div>

      {hasAlerts && topAlert && styles ? (
        <div className="space-y-1.5">
          {/* Top alert */}
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`}
              aria-hidden="true"
            />
            <span className={`text-xs font-medium ${styles.text}`}>
              {topAlert.label}
            </span>
          </div>

          {/* Remaining count */}
          {alerts.length > 1 && (
            <p className="pl-3.5 text-xs text-(--color-text-tertiary)">
              +{alerts.length - 1} more
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
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
  );
}
