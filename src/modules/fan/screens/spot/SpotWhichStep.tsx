import type { Dispatch, SetStateAction } from "react";
import { CheckCircle } from "lucide-react";
import { ResponsiveNganyaImage } from "@/components/ui/ResponsiveNganyaImage";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";
import SearchInput from "@/components/ui/SearchInput";
import { LoadingButton } from "@/components/ui/loading";
import type { SpotCandidate, SpotDraft } from "./spot-types";
import { getSignalCue } from "./spot-domain";

interface SpotWhichStepProps {
  draft: SpotDraft;
  setDraft: Dispatch<SetStateAction<SpotDraft>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  spotCandidates: SpotCandidate[];
  onContinue: () => void;
}

export default function SpotWhichStep({
  draft,
  setDraft,
  searchQuery,
  setSearchQuery,
  spotCandidates,
  onContinue,
}: SpotWhichStepProps) {
  return (
    <section className="space-y-5">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by nganya name..."
      />

      <div className="max-h-[460px] overflow-y-auto overscroll-contain space-y-2 pr-0.5">
        {spotCandidates.length > 0 ? (
          spotCandidates.map((candidate) => {
            const selected = draft.nganyaId === candidate.id;
            return (
              <button
                key={candidate.id}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    nganyaId: candidate.id,
                  }))
                }
                className={`grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-all backdrop-blur-md ${
                  selected
                    ? "border-[var(--color-accent)]/60 bg-[var(--glass-bg)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]"
                    : "border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--color-accent)]/25 hover:bg-[var(--glass-bg)]"
                }`}
              >
                <ResponsiveNganyaImage
                  src={pickPrimaryNganyaImageUrl(candidate) ?? ""}
                  alt={candidate.name}
                  corridorName={candidate.corridorName}
                  variant="compact"
                  className="h-14 w-14 rounded-[var(--radius-md)] object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {candidate.name}
                  </div>
                  <div className="truncate text-xs text-[var(--color-text-tertiary)]">
                    {candidate.corridorName}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {candidate.liveCue ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                        Live
                      </span>
                    ) : (
                      <span className="truncate text-xs text-[var(--color-text-tertiary)]">
                        {getSignalCue(candidate)}
                      </span>
                    )}
                    {/* {lastSeen && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
                        <Clock className="h-3 w-3" />
                        {lastSeen}
                      </span>
                    )} */}
                  </div>
                </div>
                <CheckCircle
                  className={`h-4 w-4 shrink-0 transition-opacity ${selected ? "opacity-100 text-[var(--color-accent)]" : "opacity-0"}`}
                />
              </button>
            );
          })
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--glass-border)] p-5 text-sm text-[var(--color-text-secondary)]">
            No nganyas match this route and search. Try another name or
            switch route.
          </div>
        )}
      </div>

      <div className="flex md:justify-center">
        <LoadingButton
          variant="primary"
          className="w-full md:w-auto md:min-w-52"
          disabled={!draft.nganyaId}
          onClick={onContinue}
        >
          Continue
        </LoadingButton>
      </div>
    </section>
  );
}
