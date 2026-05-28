import { AlertTriangle, CheckCircle, Radio, ShieldCheck } from "lucide-react";
import Chip from "@/components/ui/Chip";
import { LoadingButton } from "@/components/ui/loading";
import { ResponsiveNganyaImage } from "@/components/ui/ResponsiveNganyaImage";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";
import type {
  QualitySummary,
  SpotDraft,
  SpotDuplicateSighting,
  SpotSelectedCorridor,
  SpotSelectedNganya,
} from "./spot-types";

interface SpotConfirmStepProps {
  draft: SpotDraft;
  selectedNganyaData: SpotSelectedNganya;
  selectedCorridor: SpotSelectedCorridor;
  qualitySummary: QualitySummary;
  corroborationMinutes: number | null;
  duplicateWindowSighting: SpotDuplicateSighting;
  corridorWarning: string | null;
  submitError: string | null;
  isSubmitting: boolean;
  confirmationChecked: boolean;
  isCorridorBlocking: boolean;
  onSubmit: () => void;
}

export default function SpotConfirmStep({
  draft,
  selectedNganyaData,
  selectedCorridor,
  qualitySummary,
  corroborationMinutes,
  duplicateWindowSighting,
  corridorWarning,
  submitError,
  isSubmitting,
  confirmationChecked,
  isCorridorBlocking,
  onSubmit,
}: SpotConfirmStepProps) {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        {/* ── Left: summary + confirmation ── */}
        <div className="space-y-4">
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
            <div className="flex items-start gap-4">
              <ResponsiveNganyaImage
                src={pickPrimaryNganyaImageUrl(selectedNganyaData) ?? ""}
                alt={selectedNganyaData?.name || "Selected nganya"}
                corridorName={
                  selectedCorridor?.name ||
                  selectedNganyaData?.corridors?.name ||
                  null
                }
                variant="compact"
                className="h-16 w-16 rounded-[var(--radius-lg)] object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-semibold text-[var(--color-text-primary)]">
                  {selectedNganyaData?.name || "Nganya pending"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCorridor ? (
                    <Chip label={selectedCorridor.name} variant="route" />
                  ) : null}
                  {draft.direction ? (
                    <Chip
                      label={
                        draft.direction === "TOWN"
                          ? "-> Town"
                          : `-> ${selectedCorridor?.name || "Terminal"}`
                      }
                      variant="status"
                    />
                  ) : null}
                  <Chip label="Live location on submit" variant="route" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-caption text-[var(--color-text-tertiary)]">
                Photo
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                {draft.photoName ? "Added" : "Not added"}
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-caption text-[var(--color-text-tertiary)]">
                Timing freshness
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                Posting now
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">
              Context
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.evidenceTags.length > 0 ? (
                draft.evidenceTags.map((tag) => (
                  <Chip key={tag} label={tag} variant="route" />
                ))
              ) : (
                <span className="text-sm text-[var(--color-text-secondary)]">
                  No quick context added.
                </span>
              )}
            </div>
            {draft.note.trim() ? (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                {draft.note.trim()}
              </p>
            ) : null}
          </div>

          {corroborationMinutes !== null ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-cyan)]/20 bg-[rgba(34,211,238,0.08)] p-4 text-sm text-[var(--color-text-secondary)]">
              Last spotted {corroborationMinutes}m ago by another fan.
            </div>
          ) : null}

          {duplicateWindowSighting ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/40 bg-[rgba(251,191,36,0.08)] p-4 text-sm text-[var(--color-text-secondary)]">
              You already posted this nganya recently. Wait a few minutes
              before sending another confirmation.
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

          {submitError ? (
            <p role="alert" className="text-sm text-red-300">{submitError}</p>
          ) : null}
          <div className="flex md:justify-center">
            <LoadingButton
              variant="primary"
              className="w-full md:w-auto md:min-w-52"
              isLoading={isSubmitting}
              loadingLabel="Verifying live signal..."
              onClick={onSubmit}
              disabled={
                !confirmationChecked ||
                duplicateWindowSighting ||
                isCorridorBlocking
              }
            >
              Confirm & Share Live
            </LoadingButton>
          </div>
        </div>

        {/* ── Right: signal quality aside ── */}
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
              Signal quality: {qualitySummary.level}
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {qualitySummary.reasons.join(" + ") ||
                "Add route fit, photo, or corroboration to raise trust."}
            </p>
            <div className="mt-4 space-y-3">
              {qualitySummary.factors.map((factor) => (
                <div
                  key={factor.label}
                  className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                      {factor.label}
                    </span>
                    {factor.passed ? (
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                    ) : (
                      <Radio className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    {factor.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
