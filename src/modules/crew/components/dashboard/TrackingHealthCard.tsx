/**
 * TrackingHealthCard — Dashboard card summarising tracking pipeline health.
 *
 * Wraps TrackingHealthPanel in a compact glass card with a card title.
 * Replaces the old full-width PermissionBanner for non-blocking states.
 * Purely presentational — no internal state.
 */

import { Radio } from "lucide-react";
import { TrackingHealthPanel } from "@/modules/crew/components/TrackingHealthPanel";
import type { TrackingHealthPanelProps } from "@/modules/crew/components/TrackingHealthPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackingHealthCardProps extends Omit<
  TrackingHealthPanelProps,
  "className"
> {
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrackingHealthCard({
  className = "",
  ...panelProps
}: TrackingHealthCardProps) {
  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 ${className}`}
    >
      {/* Card header */}
      <div className="mb-3 flex items-center gap-2">
        <Radio
          className="h-3.5 w-3.5 shrink-0 text-(--color-text-tertiary)"
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
          Tracking health
        </span>
      </div>

      {/* Health chips */}
      <TrackingHealthPanel {...panelProps} />
    </div>
  );
}
