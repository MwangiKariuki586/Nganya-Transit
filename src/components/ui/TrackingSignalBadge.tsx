/**
 * TrackingSignalBadge — Source state badge for the tracking experience.
 *
 * Clearly distinguishes:
 *   LIVE      → crew GPS, fresh ping (green, pulsing)
 *   ESTIMATED → sightings-based or aging GPS (amber) — also covers AGING state
 *   STALE     → last-known location only (grey, no pulse)
 *   EXPIRED   → signal too old for live surfaces (muted, no pulse)
 */

import type { TrackingSignalType } from "@/lib/types/tracking";
import { formatAgeShort } from "@/lib/tracking-signal";

interface TrackingSignalBadgeProps {
  signalType: TrackingSignalType;
  freshnessSeconds?: number;
  className?: string;
  /** Show full label or compact dot-only */
  compact?: boolean;
}

const config: Record<
  TrackingSignalType,
  { label: string; color: string; bg: string; border: string; pulse: boolean }
> = {
  LIVE: {
    label: "LIVE",
    color: "var(--color-green)",
    bg: "var(--color-green-soft)",
    border: "rgba(57,255,20,0.3)",
    pulse: true,
  },
  ESTIMATED: {
    label: "AGING",
    color: "var(--color-warning)",
    bg: "var(--color-warning-soft)",
    border: "rgba(255,193,7,0.3)",
    pulse: false,
  },
  STALE: {
    label: "LAST KNOWN",
    color: "var(--color-text-tertiary)",
    bg: "var(--glass-bg)",
    border: "var(--glass-border)",
    pulse: false,
  },
  EXPIRED: {
    label: "EXPIRED",
    color: "var(--color-text-tertiary)",
    bg: "var(--glass-bg)",
    border: "var(--glass-border)",
    pulse: false,
  },
};

export default function TrackingSignalBadge({
  signalType,
  freshnessSeconds,
  className = "",
  compact = false,
}: TrackingSignalBadgeProps) {
  const cfg = config[signalType];

  const freshnessLabel =
    freshnessSeconds !== undefined ? formatAgeShort(freshnessSeconds) : null;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${className}`}
        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
        title={cfg.label}
      >
        <span
          className={`w-3 h-3 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
          style={{ backgroundColor: cfg.color }}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-full)] text-[10px] font-bold tracking-widest uppercase border ${className}`}
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
      {freshnessLabel && signalType === "LIVE" && (
        <span className="opacity-60 normal-case tracking-normal font-normal">
          · {freshnessLabel}
        </span>
      )}
      {freshnessLabel && signalType === "ESTIMATED" && (
        <span className="opacity-60 normal-case tracking-normal font-normal">
          · {freshnessLabel}
        </span>
      )}
      {freshnessLabel && signalType === "STALE" && (
        <span className="opacity-60 normal-case tracking-normal font-normal">
          · last active {freshnessLabel}
        </span>
      )}
    </span>
  );
}
