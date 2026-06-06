/**
 * SessionMetricsCard — Compact dashboard card showing session KPIs.
 *
 * Displays duration, updates sent, and current seats in a tight 3-column grid.
 * Derives duration live via a local interval.
 * Purely presentational — no external data fetching.
 */

import { Clock, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionMetricsCardProps {
  startedAt: string;
  seats: number;
  /** Estimated total location updates sent this session */
  totalUpdates?: number;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDuration(startedAt: string): string {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const update = () => {
      const diffMs = Date.now() - new Date(startedAt).getTime();
      const h = Math.floor(diffMs / 3_600_000);
      const m = Math.floor((diffMs % 3_600_000) / 60_000);
      setDuration(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [startedAt]);

  return duration;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionMetricsCard({
  startedAt,
  seats,
  totalUpdates,
  className = "",
}: SessionMetricsCardProps) {
  const duration = useDuration(startedAt);

  const stats = [
    {
      icon: Clock,
      label: "Duration",
      value: duration || "—",
      color: "text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "Updates",
      value: totalUpdates != null ? String(totalUpdates) : "—",
      color: "text-[var(--color-success)]",
    },
    {
      icon: Users,
      label: "Seats",
      value: seats === 0 ? "Full" : String(seats),
      color: seats === 0 ? "text-red-400" : "text-[var(--color-cyan)]",
    },
  ];

  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 ${className}`}
    >
      {/* Card header */}
      <div className="mb-3 flex items-center gap-2">
        <BarChart2
          className="h-3.5 w-3.5 shrink-0 text-(--color-text-tertiary)"
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
          Session metrics
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-(--glass-border) bg-[rgba(10,10,15,0.4)] p-2.5"
            >
              <div className="mb-1 flex items-center gap-1">
                <Icon className={`h-3 w-3 ${stat.color}`} aria-hidden="true" />
                <span className="text-[10px] text-(--color-text-tertiary)">
                  {stat.label}
                </span>
              </div>
              <div className={`text-sm font-semibold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
