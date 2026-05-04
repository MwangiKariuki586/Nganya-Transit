/**
 * ActiveSessionSummaryStrip — Compact top-of-dashboard session identity band.
 *
 * Shows nganya name, corridor, direction, live badge, session duration,
 * and last update timestamp in a single dense row.
 * Purely presentational — no hooks, no side effects.
 */

import { useEffect, useState } from "react";
import { formatDirectionLabel } from "@/lib/formatters";
import { formatAgeShort } from "@/lib/tracking-signal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSessionSummaryStripProps {
  nganyaName: string;
  corridorName: string;
  direction: string | null;
  startedAt: string;
  /** ms since last successful upload — 0 if none yet */
  lastUpdateAgeMs: number;
  /** Optional freshness label derived from server */
  freshnessState?: "LIVE" | "AGING" | "STALE" | "EXPIRED" | null;
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
      const s = Math.floor((diffMs % 60_000) / 1_000);
      setDuration(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [startedAt]);

  return duration;
}

const FRESHNESS_LABEL: Record<string, { label: string; cls: string }> = {
  LIVE: { label: "Fresh", cls: "text-[var(--color-success)]" },
  AGING: { label: "Aging", cls: "text-[var(--color-warning)]" },
  STALE: { label: "Stale", cls: "text-red-400" },
  EXPIRED: { label: "Expired", cls: "text-red-500" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveSessionSummaryStrip({
  nganyaName,
  corridorName,
  direction,
  startedAt,
  lastUpdateAgeMs,
  freshnessState,
  className = "",
}: ActiveSessionSummaryStripProps) {
  const duration = useDuration(startedAt);
  const directionLabel =
    formatDirectionLabel(direction, corridorName) ?? direction ?? "—";

  const lastUpdateLabel =
    lastUpdateAgeMs > 0
      ? formatAgeShort(Math.floor(lastUpdateAgeMs / 1_000))
      : "—";

  const freshness = freshnessState ? FRESHNESS_LABEL[freshnessState] : null;

  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) px-4 py-3 ${className}`}
      role="banner"
      aria-label="Active session summary"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {/* Left: identity */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Live pulse dot */}
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--color-accent) shadow-(--glow-accent-sm) animate-pulse"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold leading-tight text-(--color-text-primary) sm:text-lg">
              {nganyaName}
            </h1>
            <p className="truncate text-xs text-(--color-text-secondary)">
              {corridorName}&nbsp;&middot;&nbsp;{directionLabel}
            </p>
          </div>
        </div>

        {/* Right: live badge + meta */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* LIVE badge */}
          <span className="rounded-full border border-(--color-accent)/40 bg-(--color-accent-soft) px-2.5 py-0.5 text-xs font-semibold text-(--color-accent)">
            LIVE
          </span>

          {/* Duration */}
          <span className="text-xs font-medium text-(--color-text-secondary)">
            {duration}
          </span>

          {/* Last update */}
          <span className="text-xs text-(--color-text-tertiary)">
            Updated&nbsp;{lastUpdateLabel}
          </span>

          {/* Freshness pill — only when available */}
          {freshness && (
            <span className={`text-xs font-medium ${freshness.cls}`}>
              {freshness.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
