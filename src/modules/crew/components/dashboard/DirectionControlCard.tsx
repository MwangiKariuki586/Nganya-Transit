/**
 * DirectionControlCard — Dashboard card for direction toggle.
 *
 * Wraps DirectionToggle in a compact glass card with a pending indicator.
 * Purely presentational — no internal state.
 */

import { ArrowLeftRight } from "lucide-react";
import {
  DirectionToggle,
  type CrewDirectionValue,
} from "@/modules/crew/components/DirectionToggle";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DirectionControlCardProps {
  direction: CrewDirectionValue | null;
  onDirectionChange: (value: CrewDirectionValue) => void;
  disabled?: boolean;
  isPending?: boolean;
  toTownLabel?: string;
  fromTownLabel?: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DirectionControlCard({
  direction,
  onDirectionChange,
  disabled = false,
  isPending = false,
  toTownLabel = "→ Town",
  fromTownLabel = "→ Terminal",
  className = "",
}: DirectionControlCardProps) {
  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 ${className}`}
    >
      {/* Card header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight
            className="h-3.5 w-3.5 shrink-0 text-(--color-text-tertiary)"
            aria-hidden="true"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
            Direction
          </span>
        </div>
        {isPending && (
          <span className="text-xs text-(--color-text-tertiary)">
            Updating…
          </span>
        )}
      </div>

      {/* Direction toggle */}
      <DirectionToggle
        value={direction}
        onChange={onDirectionChange}
        disabled={disabled}
        toTownLabel={toTownLabel}
        fromTownLabel={fromTownLabel}
      />
    </div>
  );
}
