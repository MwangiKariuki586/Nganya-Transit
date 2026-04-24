import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, ChevronLeft, ImagePlus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { InlineErrorState } from "@/components/error/InlineErrorState";
import { useToast } from "@/components/ui/ToastContainer";
import { corridorRepository } from "@/entities/corridor/repository";
import { nganyaRegistrationService } from "@/features/nganya-registration/services/nganya-registration-service";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import type { NganyaRegistrationRequestStatus } from "@/shared/types/nganya-registration";

const TAG_OPTIONS = [
  "NEW_BUILD",
  "CLEAN_SOUND",
  "BASS_HEAVY",
  "LED_MONSTER",
  "ROUTE_OG",
];

function normalizePlateInput(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

function normalizeTagInput(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getPlateLast4(value: string) {
  const clean = normalizePlateInput(value).replace(/[^A-Z0-9]/g, "");
  if (!clean) return null;
  return clean.slice(-4);
}

function normalizeImageUrl(value: string) {
  return value.trim();
}

function isValidImageUrl(value: string) {
  try {
    const url = new URL(normalizeImageUrl(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function hashPlate(value: string) {
  const clean = normalizePlateInput(value);
  if (!clean) return null;

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(clean),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

interface CrewRegistrationScreenProps {
  initialCorridorId?: string | null;
  entryReason?: string | null;
  mode?: string | null;
}

function getStatusClasses(status: NganyaRegistrationRequestStatus) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "REJECTED":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "NEEDS_INFO":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "PENDING":
    default:
      return "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]";
  }
}

function getStatusCopy(status: NganyaRegistrationRequestStatus) {
  switch (status) {
    case "APPROVED":
      return {
        eyebrow: "Registration approved",
        title: "Approved and ready",
        body: "Your request has been approved. Your nganya is now being linked, or is already linked, to this crew account for Go Live access.",
        note: "If Go Live is still unavailable, refresh once so the latest mapping state is loaded.",
      };
    case "REJECTED":
      return {
        eyebrow: "Registration update",
        title: "Request rejected",
        body: "This request was reviewed and rejected. Check the review note below before contacting admin for the next step.",
        note: null,
      };
    case "NEEDS_INFO":
      return {
        eyebrow: "Registration update",
        title: "More information needed",
        body: "Admin reviewed this request and needs more detail before approval. Check the review note below.",
        note: null,
      };
    case "PENDING":
    default:
      return {
        eyebrow: "Registration submitted",
        title: "Pending review",
        body: "Your request is in the admin queue. Once it is approved, the nganya will be created and mapped to your crew account automatically.",
        note: "Admin needs to review and approve this request first. After approval, your nganya will be linked to this account and you can go live immediately.",
      };
  }
}

export default function CrewRegistrationScreen({
  initialCorridorId = null,
  entryReason = null,
  mode = null,
}: CrewRegistrationScreenProps) {
  const { addToast } = useToast();
  const { snapshot } = useCrewBootstrap();
  const [corridors, setCorridors] = useState<any[]>([]);
  const [existingRequests, setExistingRequests] = useState<any[]>([]);
  const [corridorId, setCorridorId] = useState(initialCorridorId || "");
  const [proposedName, setProposedName] = useState("");
  const [plateInput, setPlateInput] = useState("");
  const [sacco, setSacco] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [isLoadingCorridors, setIsLoadingCorridors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const latestExistingRequest = existingRequests[0] ?? null;
  const activeRequest = submittedRequest ?? latestExistingRequest;
  const assignment = snapshot.bootstrap.assignment;
  const activeSession = snapshot.bootstrap.active_session;

  useEffect(() => {
    if (assignment || activeSession) {
      setIsLoadingCorridors(false);
      return;
    }

    let mounted = true;

    Promise.all([
      corridorRepository.list(),
      nganyaRegistrationService.listMyRequests({ limit: 6 }),
    ])
      .then(([data, requestData]) => {
        if (!mounted) return;
        setLoadError(null);
        setCorridors(data || []);
        setExistingRequests(requestData || []);
        if (!initialCorridorId && data?.[0]?.id) {
          setCorridorId(data[0].id);
        }
      })
      .catch((loadError: any) => {
        if (!mounted) return;
        setLoadError(loadError?.message || "Failed to load corridors.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingCorridors(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeSession, assignment, initialCorridorId]);

  const filePreviews = useMemo(
    () =>
      files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      filePreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [filePreviews]);

  if (
    loadError &&
    !corridors.length &&
    !latestExistingRequest &&
    !isLoadingCorridors
  ) {
    return (
      <div className="page-container py-8 md:py-10">
        <InlineErrorState
          title="Registration form failed to load"
          message={loadError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []).slice(0, 3);
    setFiles(nextFiles);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  };

  const addCustomTag = () => {
    const normalizedTag = normalizeTagInput(customTagInput);

    if (!normalizedTag) {
      addToast("Enter a valid tag first.", "error");
      return;
    }

    setSelectedTags((current) => {
      if (current.includes(normalizedTag)) {
        return current;
      }

      return [...current, normalizedTag];
    });
    setCustomTagInput("");
  };

  const removeFileAtIndex = (index: number) => {
    setFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const addImageUrl = () => {
    const nextUrl = normalizeImageUrl(imageUrlInput);

    if (!nextUrl) {
      addToast("Enter an image URL first.", "error");
      return;
    }

    if (!isValidImageUrl(nextUrl)) {
      addToast("Enter a valid http or https image URL.", "error");
      return;
    }

    setImageUrls((current) => {
      if (current.includes(nextUrl)) {
        return current;
      }

      return [...current, nextUrl].slice(0, 3);
    });
    setBrokenImageUrls((current) => current.filter((url) => url !== nextUrl));
    setImageUrlInput("");
  };

  const removeImageUrlAtIndex = (index: number) => {
    const targetUrl = imageUrls[index];
    setImageUrls((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
    setBrokenImageUrls((current) => current.filter((url) => url !== targetUrl));
  };

  const handleImageUrlLoadError = (url: string) => {
    setBrokenImageUrls((current) =>
      current.includes(url) ? current : [...current, url],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!corridorId || !proposedName.trim()) {
      addToast("Route and nganya name are required.", "error");
      return;
    }

    if (files.length === 0 && imageUrls.length === 0) {
      addToast("Add at least one photo or image URL for review.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const requestId = crypto.randomUUID();
      const [plateHash, uploads] = await Promise.all([
        hashPlate(plateInput),
        nganyaRegistrationService.uploadRequestMedia(requestId, files),
      ]);

      const linkedMedia = imageUrls.map((url, index) => ({
        storagePath: `external:${url}`,
        mediaUrl: url,
        sortOrder: uploads.length + index,
      }));

      const request = await nganyaRegistrationService.submitRequest({
        id: requestId,
        corridorId,
        proposedName: proposedName.trim(),
        plateLast4: getPlateLast4(plateInput),
        plateHash,
        sacco: sacco.trim() || null,
        tags: selectedTags,
        media: [...uploads, ...linkedMedia],
      });

      setSubmittedRequest(request);
      addToast("Registration submitted for review.", "success");
    } catch (submitError: any) {
      const message =
        submitError?.message || "Failed to submit registration request.";
      if (message.startsWith("REGISTRATION_ALREADY_EXISTS:")) {
        const existingStatus = message.split(":")[1] || "PENDING";
        addToast(
          `This account already has a nganya registration (${existingStatus}). One nganya registration is allowed per account.`,
          "error",
        );
      } else {
        addToast(message, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeSession || assignment) {
    return (
      <div className="page-container max-w-3xl py-8 md:py-10">
        <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[var(--shadow-md)]">
          <div className="text-tag text-[var(--color-accent)]">
            Crew setup resolved
          </div>
          <h1 className="mt-2 text-h2 text-white">
            {activeSession
              ? "You already have a live session"
              : "Your nganya is already assigned"}
          </h1>
          <p className="mt-3 text-body text-[var(--color-text-secondary)]">
            {activeSession
              ? "Resume or end the active session from the crew resolver instead of opening registration again."
              : "This account is already ready for Go Live. Head back through the crew resolver to continue."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/crew"
              className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white no-underline shadow-[var(--glow-accent-sm)]"
            >
              Return to crew setup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (activeRequest) {
    const statusCopy = getStatusCopy(activeRequest.status);

    return (
      <div className="page-container max-w-3xl py-8 md:py-10">
        <div className="rounded-[28px] border border-[var(--color-accent)]/30 bg-[var(--glass-bg-strong)] p-6 shadow-[var(--glow-accent-sm)]">
          <div className="text-tag text-[var(--color-accent)]">
            {statusCopy.eyebrow}
          </div>
          <h1 className="text-h2 mt-2 text-white">{statusCopy.title}</h1>
          <p className="text-body mt-3 text-[var(--color-text-secondary)]">
            {statusCopy.body}
          </p>
          <div className="mt-5 grid gap-3 rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 text-sm text-[var(--color-text-secondary)] md:grid-cols-2">
            <div>
              Route: {activeRequest.corridors?.name || "Unknown corridor"}
            </div>
            <div>Status: {activeRequest.status}</div>
            <div>Name: {activeRequest.proposed_name}</div>
            <div>
              Submitted: {new Date(activeRequest.created_at).toLocaleString()}
            </div>
          </div>

          {activeRequest.review_notes ? (
            <div className="mt-5 rounded-[20px] border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-[var(--color-text-secondary)]">
              <div className="font-semibold text-[var(--color-text-primary)]">
                Review note
              </div>
              <div className="mt-1">{activeRequest.review_notes}</div>
            </div>
          ) : null}

          {statusCopy.note ? (
            <div className="mt-5 rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] p-4 text-sm text-[var(--color-text-secondary)]">
              <div className="font-semibold text-[var(--color-text-primary)]">
                {activeRequest.status === "PENDING"
                  ? "Processing now"
                  : mode === "needs_info"
                    ? "Needs info"
                    : "Next step"}
              </div>
              <div className="mt-1">{statusCopy.note}</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl py-8 md:py-10">
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/crew"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-primary)] no-underline transition-all hover:border-[var(--glass-border-hover)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="text-tag text-[var(--color-accent)]">
            Crew registration
          </div>
          <h1 className="text-h2 mt-1 text-white">Register a nganya</h1>
        </div>
      </div>

      {entryReason === "mapping-required" ? (
        <div className="mb-5 rounded-[24px] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 text-sm text-[var(--color-text-secondary)] shadow-[var(--glow-accent-sm)]">
          <div className="font-semibold text-[var(--color-text-primary)]">
            Register first to unlock Go Live
          </div>
          <div className="mt-1">
            This crew account has no linked nganya yet. Submit one for review
            first, then go live after approval and mapping.
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <div className="text-caption text-[var(--color-text-tertiary)]">
            1. Route terminal
          </div>
          <select
            id="reg-corridor"
            aria-label="Route terminal"
            value={corridorId}
            onChange={(event) => setCorridorId(event.target.value)}
            disabled={isLoadingCorridors}
            className="mt-3 min-h-[48px] w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="">Select route</option>
            {corridors.map((corridor) => (
              <option key={corridor.id} value={corridor.id}>
                {corridor.name}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <div className="text-caption text-[var(--color-text-tertiary)]">
            2. Build details
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="reg-name" className="text-body-sm text-[var(--color-text-secondary)]">
                Nganya name
              </label>
              <input
                id="reg-name"
                value={proposedName}
                onChange={(event) => setProposedName(event.target.value)}
                placeholder="e.g. Street Saint"
                className="mt-2 min-h-[48px] w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="reg-plate" className="text-body-sm text-[var(--color-text-secondary)]">
                Plate info
              </label>
              <input
                id="reg-plate"
                value={plateInput}
                onChange={(event) => setPlateInput(event.target.value)}
                placeholder="KDM 421X"
                className="mt-2 min-h-[48px] w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <div className="mt-2 text-caption text-[var(--color-text-tertiary)]">
                Plate is stored as a secure hash plus last 4 only.
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="reg-sacco" className="text-body-sm text-[var(--color-text-secondary)]">
                SACCO (optional)
              </label>
              <input
                id="reg-sacco"
                value={sacco}
                onChange={(event) => setSacco(event.target.value)}
                placeholder="e.g. Super Metro"
                className="mt-2 min-h-[48px] w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <div className="text-caption text-[var(--color-text-tertiary)]">
            3. Photos
          </div>
          <label className="mt-3 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--glass-border-hover)] bg-[rgba(10,10,15,0.4)] px-4 py-5 text-center transition-all hover:border-[var(--color-accent)] hover:bg-[rgba(255,45,120,0.06)]">
            <ImagePlus className="h-6 w-6 text-[var(--color-accent)]" />
            <div className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
              Add 1 to 3 photos
            </div>
            <div className="mt-1 text-body-sm text-[var(--color-text-secondary)]">
              Camera-first. Clear front, side, or rear shots help admin verify
              faster.
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <div className="mt-4 rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] p-4">
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              Or paste an image URL
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={imageUrlInput}
                onChange={(event) => setImageUrlInput(event.target.value)}
                placeholder="https://..."
                className="min-h-[48px] flex-1 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                onClick={addImageUrl}
              >
                Add URL
              </Button>
            </div>
          </div>

          {filePreviews.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {filePreviews.map((item, index) => (
                <div
                  key={`${item.file.name}-${index}`}
                  className="relative overflow-hidden rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)]"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                    onClick={() => removeFileAtIndex(index)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {imageUrls.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {imageUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative overflow-hidden rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)]"
                >
                  {brokenImageUrls.includes(url) ? (
                    <div className="flex h-32 w-full flex-col items-center justify-center px-3 text-center">
                      <div className="text-body-sm text-[var(--color-text-primary)]">
                        Image unavailable
                      </div>
                      <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                        This URL could not be rendered as an image.
                      </div>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Registration reference ${index + 1}`}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageUrlLoadError(url)}
                    />
                  )}
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                    onClick={() => removeImageUrlAtIndex(index)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <div className="text-caption text-[var(--color-text-tertiary)]">
            4. Tags
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-[999px] border px-3 py-2 text-caption transition-all ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
                      : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)] hover:border-[var(--glass-border-hover)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] p-4">
            <div className="text-body-sm text-[var(--color-text-secondary)]">
              Add your own tag
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={customTagInput}
                onChange={(event) => setCustomTagInput(event.target.value)}
                placeholder="e.g. GRAFFITI_KING"
                className="min-h-[48px] flex-1 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                onClick={addCustomTag}
              >
                Add tag
              </Button>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-10 rounded-[24px] border border-[var(--glass-border)] bg-[var(--color-bg-base)]/92 p-3 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-caption text-[var(--color-text-tertiary)]">
                Review queue
              </div>
              <div className="text-body-sm text-[var(--color-text-secondary)]">
                Submitted builds stay private until admin approval.
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="min-h-[48px] rounded-[18px] px-5 text-sm font-semibold"
              isLoading={isSubmitting}
            >
              <Camera className="h-4 w-4" />
              Submit for review
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
