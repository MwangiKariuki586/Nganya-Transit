import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { LoadingButton } from "@/components/ui/loading";
import type { CorridorSuggestion, SpotDraft } from "./spot-types";
import { getRouteFitMessage } from "./spot-domain";

interface SpotWhereStepProps {
  draft: SpotDraft;
  setDraft: Dispatch<SetStateAction<SpotDraft>>;
  corridors: any[];
  locationSuggestion: CorridorSuggestion;
  isDetectingCorridor: boolean;
  routeFitChecked: boolean;
  isCorridorBlocking: boolean;
  routeFitDistance: number | null;
  corridorWarning: string | null;
  isValidatingRoute: boolean;
  directionOptions: Array<{ value: string; label: string }>;
  onApplyLocationSuggestion: () => void;
  onContinue: () => void;
}

export default function SpotWhereStep({
  draft,
  setDraft,
  corridors,
  locationSuggestion,
  isDetectingCorridor,
  routeFitChecked,
  isCorridorBlocking,
  routeFitDistance,
  corridorWarning,
  isValidatingRoute,
  directionOptions,
  onApplyLocationSuggestion,
  onContinue,
}: SpotWhereStepProps) {
  return (
    <section className="space-y-5">
      {/* <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
        <div className="flex items-start gap-3">
          <Navigation className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          <div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              We verify your route before you continue
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
              Pick the route now. MATWANA checks it against your live device
              location before you move on.
            </p>
          </div>
        </div>
      </div> */}

      {locationSuggestion.corridorId ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                {locationSuggestion.source === "planner"
                  ? `Recent route suggests ${locationSuggestion.corridorName}`
                  : `We think you're on ${locationSuggestion.corridorName}`}
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                Confirm or switch before continuing.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  corridorId: locationSuggestion.corridorId,
                }))
              }
            >
              Use it
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={onApplyLocationSuggestion}
          isLoading={isDetectingCorridor}
        >
          <MapPin className="h-4 w-4" />
          Suggest from location
        </Button>
      </div>

      {routeFitChecked && !isCorridorBlocking ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[rgba(34,197,94,0.08)] p-4 text-sm text-[var(--color-text-secondary)]">
          {getRouteFitMessage(routeFitDistance)}
        </div>
      ) : null}

      {corridorWarning ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/40 bg-[rgba(251,191,36,0.08)] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
            <div className="text-sm text-[var(--color-text-secondary)]">
              {corridorWarning}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {corridors.map((corridor: any) => {
          const selected = draft.corridorId === corridor.id;
          const suggested = locationSuggestion.corridorId === corridor.id;
          return (
            <button
              key={corridor.id}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  corridorId: corridor.id,
                }))
              }
              className={`rounded-[var(--radius-md)] border p-4 text-left transition-all backdrop-blur-md ${
                selected
                  ? "border-[var(--color-accent)]/60 bg-[var(--glass-bg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]"
                  : "border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--color-accent)]/25 hover:bg-[var(--glass-bg)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {corridor.name}
                </span>
                {suggested ? (
                  <Chip label="Suggested" variant="route" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
        <div className="text-caption text-[var(--color-text-tertiary)]">
          Direction
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {directionOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              variant="route"
              isActive={draft.direction === option.value}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  direction: option.value,
                }))
              }
            />
          ))}
        </div>
      </div>

      <div className="flex md:justify-center">
        <LoadingButton
          variant="primary"
          className="w-full md:w-auto md:min-w-52"
          disabled={!draft.corridorId || !draft.direction}
          onClick={onContinue}
          isLoading={isValidatingRoute}
          loadingLabel="Checking route..."
        >
          Continue
        </LoadingButton>
      </div>
    </section>
  );
}
