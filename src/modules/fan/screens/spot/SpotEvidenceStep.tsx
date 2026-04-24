import type { Dispatch, SetStateAction } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import Chip from "@/components/ui/Chip";
import { LoadingButton } from "@/components/ui/loading";
import type { SpotDraft } from "./spot-types";
import { CONTEXT_TAGS } from "./spot-types";
import { clearPhotoSelection } from "./spot-domain";

interface SpotEvidenceStepProps {
  draft: SpotDraft;
  setDraft: Dispatch<SetStateAction<SpotDraft>>;
  selectedPhotoName: string | null;
  setSelectedPhotoName: Dispatch<SetStateAction<string | null>>;
  selectedPhotoPreviewUrl: string | null;
  setSelectedPhotoPreviewUrl: Dispatch<SetStateAction<string | null>>;
  onToggleContextTag: (tag: string) => void;
  onContinue: () => void;
}

export default function SpotEvidenceStep({
  draft,
  setDraft,
  selectedPhotoName,
  setSelectedPhotoName,
  selectedPhotoPreviewUrl,
  setSelectedPhotoPreviewUrl,
  onToggleContextTag,
  onContinue,
}: SpotEvidenceStepProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
        <div className="flex items-start gap-3">
          <Camera className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          <div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              Photos improve trust and visibility
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
              Photo helps confirm build, livery, and route presence. It
              stays optional so the flow stays quick.
            </p>
          </div>
        </div>
      </div>

      <label className="block cursor-pointer rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] p-4 transition-colors hover:border-[var(--glass-border-hover)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--glass-bg)]">
              <ImagePlus className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                {selectedPhotoName ? "Photo added" : "Add a photo"}
              </div>
              <p className="mt-1 truncate text-xs text-[var(--color-text-tertiary)]">
                {selectedPhotoName
                  ? `${selectedPhotoName} stays local for now while uploads remain lightweight.`
                  : "Quick camera or upload evidence. Optional, but it strengthens the signal."}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            {selectedPhotoName ? "Change" : "Choose"}
          </span>
        </div>
        {selectedPhotoPreviewUrl ? (
          <div className="relative mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                clearPhotoSelection({
                  selectedPhotoPreviewUrl,
                  setSelectedPhotoName,
                  setSelectedPhotoPreviewUrl,
                  setDraft,
                });
              }}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[rgba(15,15,22,0.78)] text-[var(--color-text-primary)] backdrop-blur-md transition-colors hover:border-[var(--glass-border-hover)] hover:bg-[rgba(15,15,22,0.92)]"
              aria-label="Remove selected image"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={selectedPhotoPreviewUrl}
              alt={selectedPhotoName || "Selected sighting preview"}
              className="h-48 w-full object-cover md:h-64"
            />
          </div>
        ) : null}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            const fileName = file?.name || null;
            if (selectedPhotoPreviewUrl) {
              URL.revokeObjectURL(selectedPhotoPreviewUrl);
            }
            setSelectedPhotoName(fileName);
            setSelectedPhotoPreviewUrl(
              file ? URL.createObjectURL(file) : null,
            );
            setDraft((current) => ({
              ...current,
              photoName: fileName,
            }));
          }}
        />
      </label>

      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
        <div className="text-sm font-medium text-[var(--color-text-primary)]">
          Quick context
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Pick what riders should know right now.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CONTEXT_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              variant="route"
              isActive={draft.evidenceTags.includes(tag)}
              onClick={() => onToggleContextTag(tag)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
        <label
          htmlFor="spot-note"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          What stood out?
        </label>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Stage, crowd, sound, direction, or timing. Keep it short and
          useful.
        </p>
        <textarea
          id="spot-note"
          value={draft.note}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              note: event.target.value.slice(0, 180),
            }))
          }
          rows={4}
          placeholder="E.g. Queueing at Roysambu, heading to town..."
          className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
          Signal preview
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label="Route fit already checked" variant="status" />
          <Chip
            label={draft.photoName ? "Photo: added" : "Photo: not added"}
            variant="route"
          />
          <Chip
            label={
              draft.evidenceTags.length > 0
                ? `Context: ${draft.evidenceTags.length} tags`
                : "Context: none yet"
            }
            variant="route"
          />
        </div>
      </div>

      <div className="flex md:justify-center">
        <LoadingButton
          variant="primary"
          className="w-full md:w-auto md:min-w-52"
          onClick={onContinue}
        >
          Review signal
        </LoadingButton>
      </div>
    </section>
  );
}
