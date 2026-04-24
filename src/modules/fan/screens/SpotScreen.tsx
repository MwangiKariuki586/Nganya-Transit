import { ChevronLeft } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ListSkeleton } from "@/components/ui/loading";
import type { SpotRouteData } from "@/modules/fan/services/route-data";
import { STEP_ORDER } from "./spot/spot-types";
import SpotSuccessView from "./spot/SpotSuccessView";
import SpotWhereStep from "./spot/SpotWhereStep";
import SpotWhichStep from "./spot/SpotWhichStep";
import SpotEvidenceStep from "./spot/SpotEvidenceStep";
import SpotConfirmStep from "./spot/SpotConfirmStep";
import { useSpotFlow } from "./spot/useSpotFlow";

interface SpotScreenProps {
  data: SpotRouteData;
}

export default function SpotScreen({ data }: SpotScreenProps) {
  const s = useSpotFlow(data);
  const stepIndex = STEP_ORDER.indexOf(s.step);

  if (s.submittedQuality) {
    return (
      <SpotSuccessView
        quality={s.submittedQuality}
        nganyaName={s.submittedNganyaName}
        corroborationMinutes={s.submittedCorroborationMinutes}
      />
    );
  }

  if (!s.isAuthenticated) {
    return (
      <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
        <EmptyState
          variant="no-following"
          title="Sign in to verify sightings"
          message="Live signals are tied to your account and real location at submit."
          actionLabel="Sign In"
          onAction={() => s.navigate({ to: "/signin" })}
        />
      </div>
    );
  }

  return (
    <div className="page-container mx-auto max-w-3xl pt-8 pb-10 md:pt-12 md:pb-16">
      <div className="mb-6 flex items-center gap-3">
        {s.step !== "where" && (
          <button
            onClick={s.goBack}
            aria-label="Go back"
            className="rounded-full p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--glass-bg)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-h2">Spot a Nganya</h1>
          <p className="text-body-sm text-[var(--color-text-tertiary)]">
            {s.step === "where" && "Where did you see it?"}
            {s.step === "which" && "Which nganya was it?"}
            {s.step === "evidence" && "Add evidence"}
            {s.step === "confirm" && "Confirm signal"}
          </p>
        </div>
      </div>

      <div className="mb-8 flex gap-1.5">
        {STEP_ORDER.map((item, index) => (
          <div
            key={item}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index <= stepIndex ? "bg-[var(--color-accent)]" : "bg-[var(--glass-bg)]"
            }`}
          />
        ))}
      </div>

      {s.step === "where" && (
        <SpotWhereStep
          draft={s.draft} setDraft={s.setDraft} corridors={s.corridors}
          locationSuggestion={s.locationSuggestion} isDetectingCorridor={s.isDetectingCorridor}
          routeFitChecked={s.routeFitChecked} isCorridorBlocking={s.isCorridorBlocking}
          routeFitDistance={s.routeFitDistance} corridorWarning={s.corridorWarning}
          isValidatingRoute={s.isValidatingRoute} directionOptions={s.directionOptions}
          onApplyLocationSuggestion={() => void s.applyLocationSuggestion()}
          onContinue={s.continueFromWhere}
        />
      )}

      {s.step === "which" && (
        <SpotWhichStep
          draft={s.draft} setDraft={s.setDraft} searchQuery={s.searchQuery}
          setSearchQuery={s.setSearchQuery} spotCandidates={s.spotCandidates}
          onContinue={s.continueFromWhich}
        />
      )}

      {s.step === "evidence" && (
        <SpotEvidenceStep
          draft={s.draft} setDraft={s.setDraft}
          selectedPhotoName={s.selectedPhotoName} setSelectedPhotoName={s.setSelectedPhotoName}
          selectedPhotoPreviewUrl={s.selectedPhotoPreviewUrl} setSelectedPhotoPreviewUrl={s.setSelectedPhotoPreviewUrl}
          onToggleContextTag={s.toggleContextTag} onContinue={s.continueFromEvidence}
        />
      )}

      {s.step === "confirm" && (
        <SpotConfirmStep
          draft={s.draft} selectedNganyaData={s.selectedNganyaData}
          selectedCorridor={s.selectedCorridor} qualitySummary={s.qualitySummary}
          corroborationMinutes={s.corroborationMinutes} duplicateWindowSighting={s.duplicateWindowSighting}
          corridorWarning={s.corridorWarning} submitError={s.submitError}
          isSubmitting={s.isSubmitting} confirmationChecked={s.confirmationChecked}
          isCorridorBlocking={s.isCorridorBlocking} onSubmit={s.handleSubmit}
        />
      )}
    </div>
  );
}

export function SpotScreenSkeleton() {
  return (
    <div className="page-container mx-auto max-w-3xl pt-8 pb-10 md:pt-12 md:pb-16">
      <div className="mb-6">
        <div className="h-8 w-48 rounded bg-[var(--glass-bg)]" />
        <div className="mt-3 h-4 w-40 rounded bg-[rgba(255,255,255,0.08)]" />
      </div>
      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-1 flex-1 rounded-full bg-[var(--glass-bg)]" />
        ))}
      </div>
      <div className="space-y-4">
        <CardSkeleton />
        <ListSkeleton items={4} />
      </div>
    </div>
  );
}
