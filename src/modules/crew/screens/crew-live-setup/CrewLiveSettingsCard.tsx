import type { RefObject } from "react";
import { Minus, Plus } from "lucide-react";
import {
  DirectionToggle,
  type CrewDirectionValue,
} from "@/modules/crew/components/DirectionToggle";
import { SeatsQuickButtons } from "@/modules/crew/components/SeatsQuickButtons";
import { SpotlightCard } from "@/modules/crew/components/SpotlightCard";

interface CrewLiveSettingsCardProps {
  direction: CrewDirectionValue | null;
  onDirectionChange: (value: CrewDirectionValue) => void;
  seatsLeft: number;
  onSeatsChange: (value: number) => void;
  onSeatStep: (delta: number) => void;
  hasConfirmedSeats: boolean;
  hasAssignment: boolean;
  directionIsActive: boolean;
  seatsIsActive: boolean;
  settingsNeedAttention: boolean;
  directionLabels: { toTown: string; fromTown: string };
  directionSectionRef: RefObject<HTMLDivElement | null>;
  seatsSectionRef: RefObject<HTMLDivElement | null>;
}

export function CrewLiveSettingsCard({
  direction,
  onDirectionChange,
  seatsLeft,
  onSeatsChange,
  onSeatStep,
  hasConfirmedSeats,
  hasAssignment,
  directionIsActive,
  seatsIsActive,
  settingsNeedAttention,
  directionLabels,
  directionSectionRef,
  seatsSectionRef,
}: CrewLiveSettingsCardProps) {
  return (
    <SpotlightCard
      isActive={settingsNeedAttention}
      showRequiredChip={settingsNeedAttention}
    >
      <div className="text-caption text-[var(--color-text-tertiary)]">
        Live settings (required)
      </div>
      <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
        These are shown to riders in the live feed.
      </div>

      <div
        ref={directionSectionRef}
        className={`mt-4 rounded-[22px] border px-4 py-4 transition-all ${
          directionIsActive
            ? "border-[var(--color-accent)]/35 bg-[rgba(255,45,120,0.07)] shadow-[0_10px_28px_rgba(255,45,120,0.08)]"
            : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.28)]"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            Direction
          </div>
          {directionIsActive ? (
            <div className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--color-accent)]">
              REQUIRED
            </div>
          ) : null}
        </div>
        <DirectionToggle
          value={direction}
          onChange={onDirectionChange}
          disabled={!hasAssignment}
          toTownLabel={directionLabels.toTown}
          fromTownLabel={directionLabels.fromTown}
        />
        <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
          This is what riders will see on the live feed.
        </div>
      </div>

      <div
        ref={seatsSectionRef}
        className={`mt-4 rounded-[22px] border px-4 py-4 transition-all ${
          seatsIsActive
            ? "border-[var(--color-accent)]/35 bg-[rgba(255,45,120,0.07)] shadow-[0_10px_28px_rgba(255,45,120,0.08)]"
            : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.28)]"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            Seats
          </div>
          {seatsIsActive ? (
            <div className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--color-accent)]">
              REQUIRED
            </div>
          ) : null}
        </div>
        <SeatsQuickButtons
          value={seatsLeft}
          onChange={onSeatsChange}
          disabled={!hasAssignment}
          isConfirmed={hasConfirmedSeats}
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-primary)]"
            onClick={() => onSeatStep(-1)}
            disabled={!hasAssignment || seatsLeft === 0}
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex-1 rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-center text-body-sm text-[var(--color-text-secondary)]">
            {!hasConfirmedSeats
              ? "Confirm seats left"
              : seatsLeft === 0
                ? "Full (0 seats)"
                : `${seatsLeft} seats left`}
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-primary)]"
            onClick={() => onSeatStep(1)}
            disabled={!hasAssignment}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
          {seatsLeft === 0
            ? "Full selected. Consider stopping Live when boarding is fully closed."
            : "Keep it honest - it affects recommendations."}
        </div>
      </div>
    </SpotlightCard>
  );
}
