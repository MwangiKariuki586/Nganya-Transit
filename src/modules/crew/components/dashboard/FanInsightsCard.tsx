/**
 * FanInsightsCard — Aggregated fan-safe demand and engagement signals.
 *
 * Shows only aggregate counts — never individual fan identities, handles,
 * avatars, or any personally identifiable data.
 *
 * When no fan data is available, renders a clean empty state rather than
 * hiding the section, so the layout slot is always reserved.
 *
 * Purely presentational — no hooks, no data fetching.
 */

import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatAgeShort } from "@/lib/tracking-signal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FanInsightsData {
  /** Number of fans currently tracking this session */
  activeTrackers: number;
  /** Number of boarded confirmations this session */
  boardedCount: number;
  /** Number of missed reports this session */
  missedCount: number;
  /** ISO timestamp of the most recent fan activity */
  lastFanActivityAt: string | null;
}

export interface FanInsightsCardProps {
  data: FanInsightsData | null;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FanInsightsCard({
  data,
  className = "",
}: FanInsightsCardProps) {
  const hasData = data !== null && data.activeTrackers > 0;

  const lastActivityLabel = (() => {
    if (!data?.lastFanActivityAt) return null;
    const ageSec = Math.floor(
      (Date.now() - new Date(data.lastFanActivityAt).getTime()) / 1_000,
    );
    return ageSec >= 0 ? formatAgeShort(ageSec) : null;
  })();

  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 ${className}`}
    >
      {/* Card header */}
      <div className="mb-3 flex items-center gap-2">
        <Eye
          className="h-3.5 w-3.5 shrink-0 text-(--color-text-tertiary)"
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
          Fan activity
        </span>
      </div>

      {hasData && data ? (
        <div className="space-y-2">
          {/* Tracker count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-(--color-text-secondary)">
              Active trackers
            </span>
            <span className="text-sm font-semibold text-(--color-cyan)">
              {data.activeTrackers}
            </span>
          </div>

          {/* Boarded */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle
                className="h-3 w-3 text-(--color-success)"
                aria-hidden="true"
              />
              <span className="text-xs text-(--color-text-secondary)">
                Boarded
              </span>
            </div>
            <span className="text-sm font-semibold text-(--color-success)">
              {data.boardedCount}
            </span>
          </div>

          {/* Missed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3 w-3 text-red-400" aria-hidden="true" />
              <span className="text-xs text-(--color-text-secondary)">
                Missed
              </span>
            </div>
            <span className="text-sm font-semibold text-red-400">
              {data.missedCount}
            </span>
          </div>

          {/* Last activity */}
          {lastActivityLabel && (
            <div className="flex items-center justify-between pt-1 border-t border-(--glass-border)">
              <div className="flex items-center gap-1.5">
                <Clock
                  className="h-3 w-3 text-(--color-text-tertiary)"
                  aria-hidden="true"
                />
                <span className="text-xs text-(--color-text-tertiary)">
                  Last activity
                </span>
              </div>
              <span className="text-xs text-(--color-text-secondary)">
                {lastActivityLabel}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="py-2 text-center">
          <p className="text-xs font-medium text-(--color-text-secondary)">
            No fan tracking activity yet
          </p>
          <p className="mt-1 text-xs text-(--color-text-tertiary)">
            Signals will appear here once fans start tracking this session
          </p>
        </div>
      )}
    </div>
  );
}
