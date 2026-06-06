/**
 * SeatsControlCard — Dashboard card wrapping the seat counter.
 *
 * Keeps the FlexibleSeatSelector inside a compact glass card and
 * integrates the last-update timestamp directly into the card header.
 * Purely presentational wrapper — all state lives in the parent screen.
 */

import { Users } from "lucide-react";
import { FlexibleSeatSelector } from "@/modules/crew/components/FlexibleSeatSelector";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeatsControlCardProps {
  seats: number;
  onSeatsChange: (value: number) => void;
  disabled?: boolean;
  syncStatus?: "synced" | "saving" | "offline" | "error";
  lastSeatUpdateAt?: string | null;
  maxSeats?: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SeatsControlCard({
  seats,
  onSeatsChange,
  disabled = false,
  syncStatus,
  lastSeatUpdateAt,
  maxSeats = 33,
  className = "",
}: SeatsControlCardProps) {
  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 ${className}`}
    >
      {/* Card header */}
      <div className="mb-3 flex items-center gap-2">
        <Users
          className="h-3.5 w-3.5 shrink-0 text-(--color-text-tertiary)"
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
          Seats
        </span>
      </div>

      {/* Seat selector — reuses existing component */}
      <FlexibleSeatSelector
        value={seats}
        onChange={onSeatsChange}
        disabled={disabled}
        maxSeats={maxSeats}
        syncStatus={syncStatus}
        lastSeatUpdateAt={lastSeatUpdateAt}
      />

      {seats === 0 && (
        <p className="mt-3 text-xs text-(--color-text-secondary)">
          Full — if boarding is closed for a while, consider stopping the
          session.
        </p>
      )}
    </div>
  );
}
