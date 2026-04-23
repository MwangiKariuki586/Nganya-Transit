import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Route } from "@/routes/(crew)/crew/profile";
import { updateCrewProfileServerFn } from "@/shared/server-fns/crew-profile";
import { replaceAvatar, replaceCoverMedia } from "@/lib/storage/profile-media";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useToast } from "@/components/ui/ToastContainer";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { retryWithBackoff, isNetworkError } from "@/lib/utils/retry";
import { compressImage, formatFileSize } from "@/lib/utils/image-compress";
import { browserSupabase } from "@/shared/supabase/browser-client";
import AvatarRing, { computeCompleteness } from "@/components/ui/AvatarRing";
import MediaLightbox from "@/components/ui/MediaLightbox";
import { ProfileGallery } from "@/modules/crew/components/ProfileGallery";
import { User, Check, ImagePlus, Pencil, X } from "lucide-react";

export function CrewProfileScreen() {
  const router = useRouter();
  const { profile: initialProfile } = Route.useLoaderData();
  const { session } = useAuthSession();
  const toast = useToast();
  const { snapshot } = useCrewBootstrap();

  const assignment = snapshot.bootstrap.assignment;
  const routeLabel = assignment?.terminal_label ?? null;
  const nganyaId = assignment?.nganya_id ?? null;

  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    if (!nganyaId) return;
    browserSupabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("nganya_id", nganyaId)
      .then(({ count }) => setFollowerCount(count ?? 0));
  }, [nganyaId]);

  // ── Profile details editor state ──────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    full_name: initialProfile.full_name || "",
    handle: initialProfile.handle || "",
    bio: initialProfile.bio || "",
  });
  const [originalData, setOriginalData] = useState(formData);
  const [displayData, setDisplayData] = useState(formData);

  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    initialProfile.avatar_url || null,
  );
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<
    string | null
  >(null);

  // ── Cover photo editor state ──────────────────────────────────────────────
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    initialProfile.cover_media_url || null,
  );
  const [coverPreviewType, setCoverPreviewType] = useState<
    "image" | "video" | null
  >(initialProfile.cover_media_type || null);

  // ── Shared UI state ───────────────────────────────────────────────────────
  const [lightbox, setLightbox] = useState<{
    src: string;
    type: "image" | "video";
  } | null>(null);
  const heroFrameRef = useRef<HTMLDivElement | null>(null);

  const currentCoverSrc =
    coverPreviewUrl || initialProfile.cover_media_url || "";
  const currentCoverType = coverPreviewType || initialProfile.cover_media_type;

  const hasChanges =
    formData.full_name !== originalData.full_name ||
    formData.handle !== originalData.handle ||
    formData.bio !== originalData.bio;

  // ── Avatar handlers ───────────────────────────────────────────────────────
  const handleAvatarSelect = (file: File) => {
    if (pendingAvatarPreviewUrl) {
      URL.revokeObjectURL(pendingAvatarPreviewUrl);
    }

    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleAvatarConfirm = async () => {
    if (!pendingAvatarFile || !pendingAvatarPreviewUrl || !session?.user?.id) {
      return;
    }

    const avatarFile = pendingAvatarFile;
    const previewUrl = pendingAvatarPreviewUrl;
    const previousAvatarUrl = avatarPreviewUrl;

    setAvatarPreviewUrl(previewUrl);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
    setIsUploadingAvatar(true);
    setAvatarUploadProgress(0);

    const progressInterval = setInterval(() => {
      setAvatarUploadProgress((prev) => (prev >= 85 ? prev : prev + 2));
    }, 100);

    try {
      const fileToUpload = await compressImage(avatarFile, {
        maxWidthOrHeight: 400,
        quality: 0.88,
        maxSizeMB: 1,
      });

      if (fileToUpload.size < avatarFile.size) {
        toast.info(
          "Avatar compressed",
          `${formatFileSize(avatarFile.size)} → ${formatFileSize(fileToUpload.size)}`,
        );
      }

      const result = await retryWithBackoff(
        () =>
          replaceAvatar(
            fileToUpload,
            session.user.id,
            initialProfile.avatar_url || undefined,
          ),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            toast.info(
              `Retrying avatar upload...`,
              `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue detected." : ""}`,
            );
          },
        },
      );

      await retryWithBackoff(
        () =>
          updateCrewProfileServerFn({
            data: {
              accessToken: session.access_token ?? "",
              avatar_url: result.url,
            },
          }),
        { maxAttempts: 3 },
      );

      clearInterval(progressInterval);
      setAvatarUploadProgress(100);
      setAvatarPreviewUrl(result.url);
      toast.success("Avatar updated!", "Your profile image has been saved.");
      router.invalidate();
    } catch (err: any) {
      clearInterval(progressInterval);
      setAvatarUploadProgress(0);
      setAvatarPreviewUrl(previousAvatarUrl);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      toast.error(
        "Avatar upload failed",
        isNetworkError(err)
          ? "Network error. Please check your connection and try again."
          : err.message || "An unexpected error occurred.",
      );
    } finally {
      setIsUploadingAvatar(false);
      setAvatarUploadProgress(0);
    }
  };

  const handleAvatarDiscard = () => {
    if (pendingAvatarPreviewUrl) {
      URL.revokeObjectURL(pendingAvatarPreviewUrl);
    }

    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
  };

  // ── Cover upload (staged: pick → preview → confirm) ──────────────────────
  const handleCoverSelect = (file: File) => {
    setSelectedCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setCoverPreviewType("image");
  };

  const handleCoverConfirm = async () => {
    if (!selectedCoverFile || !session?.user?.id) return;

    setIsUploadingCover(true);
    setCoverUploadProgress(0);

    const progressInterval = setInterval(() => {
      setCoverUploadProgress((prev) => (prev >= 85 ? prev : prev + 2));
    }, 100);

    try {
      const coverToUpload = await compressImage(selectedCoverFile, {
        maxWidthOrHeight: 1920,
        quality: 0.85,
        maxSizeMB: 3,
      });

      if (coverToUpload.size < selectedCoverFile.size) {
        toast.info(
          "Cover compressed",
          `${formatFileSize(selectedCoverFile.size)} → ${formatFileSize(coverToUpload.size)}`,
        );
      }

      const result = await retryWithBackoff(
        () =>
          replaceCoverMedia(
            coverToUpload,
            session.user.id,
            initialProfile.cover_media_url || undefined,
          ),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            toast.info(
              `Retrying cover upload...`,
              `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue detected." : ""}`,
            );
          },
        },
      );

      clearInterval(progressInterval);
      setCoverUploadProgress(100);
      setCoverPreviewUrl(result.url);
      setCoverPreviewType(result.type);

      await retryWithBackoff(
        () =>
          updateCrewProfileServerFn({
            data: {
              accessToken: session.access_token ?? "",
              cover_media_url: result.url,
              cover_media_type: result.type,
            },
          }),
        { maxAttempts: 3 },
      );

      toast.success("Cover updated!", "Your cover photo has been saved.");
      setSelectedCoverFile(null);
      setCoverUploadProgress(0);
      // Refresh route data (updates nav avatar etc.) without a full page reload
      router.invalidate();
    } catch (err: any) {
      clearInterval(progressInterval);
      setCoverUploadProgress(0);
      // revert preview
      setCoverPreviewUrl(initialProfile.cover_media_url || null);
      setCoverPreviewType(initialProfile.cover_media_type || null);
      setSelectedCoverFile(null);

      toast.error(
        "Cover upload failed",
        isNetworkError(err)
          ? "Network error. Please check your connection and try again."
          : err.message || "An unexpected error occurred.",
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCoverDiscard = () => {
    setSelectedCoverFile(null);
    setCoverPreviewUrl(initialProfile.cover_media_url || null);
    setCoverPreviewType(initialProfile.cover_media_type || null);
  };

  // ── Profile details save ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setDisplayData(formData);
    setIsEditing(false);
    setIsSaving(true);

    const previousDisplayData = displayData;
    try {
      await retryWithBackoff(
        () =>
          updateCrewProfileServerFn({
            data: {
              accessToken: session?.access_token ?? "",
              full_name: formData.full_name || undefined,
              handle: formData.handle || undefined,
              bio: formData.bio || undefined,
            },
          }),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            toast.info(
              `Retrying profile update...`,
              `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue detected." : ""}`,
            );
          },
        },
      );

      toast.success("Profile updated!", "Your changes have been saved.");
      // Commit saved values as the new baseline — no reload needed
      const savedData = {
        full_name: formData.full_name,
        handle: formData.handle,
        bio: formData.bio,
      };
      setFormData(savedData);
      setOriginalData(savedData);
      setDisplayData(savedData);
      // Refresh route data (updates nav avatar etc.) without a full page reload
      router.invalidate();
    } catch (err: any) {
      console.error("Profile update error:", err);
      setDisplayData(previousDisplayData);
      setIsEditing(true);

      toast.error(
        "Failed to update profile",
        isNetworkError(err)
          ? "Network error. Please check your connection and try again."
          : err.message || "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetEditorState = () => {
    setFormData(originalData);
  };

  const handleCancel = () => {
    resetEditorState();
    setIsEditing(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!isEditing || isSaving) return;
        document.getElementById("profile-save-btn")?.click();
      }
      if (e.key === "Escape") {
        if (!isEditing || isSaving) return;
        document.getElementById("profile-cancel-btn")?.click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, isSaving]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

  const displayedAvatarSrc = pendingAvatarPreviewUrl || avatarPreviewUrl;

  return (
    <div className="pb-10 md:pb-16">
      {isUploadingAvatar && (
        <div className="fixed left-0 right-0 z-[var(--z-nav)] h-0.5 bg-black/20 top-0 md:top-[var(--top-nav-height)]">
          <div
            className="h-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
            style={{ width: `${avatarUploadProgress}%` }}
          />
        </div>
      )}
      {/* Cover upload progress bar — fixed below top nav (desktop) */}
      {isUploadingCover && (
        <div className="fixed left-0 right-0 z-[var(--z-nav)] h-0.5 bg-black/20 top-0 md:top-[var(--top-nav-height)]">
          <div
            className="h-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
            style={{ width: `${coverUploadProgress}%` }}
          />
        </div>
      )}

      {/* ── Cover photo ─────────────────────────────────────────────────── */}
      <div
        ref={heroFrameRef}
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(180px, 30vw, 320px)" }}
      >
        {currentCoverSrc ? (
          currentCoverType === "video" ? (
            <video
              src={currentCoverSrc}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={currentCoverSrc}
              alt="Cover"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 120% 100% at 60% 40%, rgba(255,45,120,0.18) 0%, rgba(0,240,255,0.08) 50%, transparent 80%), var(--color-bg-elevated)",
            }}
          />
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,15,0.15) 0%, rgba(10,10,15,0.1) 50%, rgba(10,10,15,0.7) 85%, var(--color-bg-base) 100%)",
          }}
        />

        {/* Lightbox trigger on non-editing view */}
        {!selectedCoverFile &&
          currentCoverSrc &&
          currentCoverType !== "video" && (
            <button
              className="absolute inset-0 h-full w-full"
              aria-label="View cover full size"
              onClick={() =>
                setLightbox({ src: currentCoverSrc, type: "image" })
              }
            />
          )}

        {/* Cover controls — top-right */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {selectedCoverFile && !isUploadingCover ? (
            /* Staged: discard (X) + confirm (tick) */
            <>
              <button
                type="button"
                aria-label="Discard cover change"
                onClick={handleCoverDiscard}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg transition-colors hover:bg-black/85"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Save cover photo"
                onClick={handleCoverConfirm}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-lg transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                <Check className="h-4 w-4" />
              </button>
            </>
          ) : (
            /* Idle: pencil file picker */
            <div className="relative overflow-hidden rounded-full border border-white/20 bg-black/70 text-white shadow-lg transition-colors hover:bg-black/85">
              <input
                id="cover-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Change cover photo"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverSelect(file);
                  e.target.value = "";
                }}
              />
              <div className="pointer-events-none flex h-10 w-10 items-center justify-center">
                <Pencil className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>

        {/* Cover upload progress — slim bar at bottom of cover */}
      </div>

      <div className="page-container" style={{ marginTop: "-56px" }}>
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:gap-6">
          <div className="relative z-10 shrink-0">
            {(() => {
              const completeness = computeCompleteness({
                fullName: displayData.full_name,
                handle: displayData.handle,
                bio: displayData.bio,
                avatarUrl: displayedAvatarSrc || "",
                coverMediaUrl: coverPreviewUrl || "",
              });
              return (
                <AvatarRing
                  percentage={completeness.percentage}
                  status={completeness.status}
                  size={96}
                >
                  <div
                    className="group relative h-24 w-24 overflow-hidden rounded-full bg-[var(--glass-bg)] ring-2 ring-[var(--color-bg-base)]"
                    onClick={() =>
                      displayedAvatarSrc &&
                      setLightbox({ src: displayedAvatarSrc, type: "image" })
                    }
                    style={{
                      cursor: displayedAvatarSrc ? "pointer" : "default",
                    }}
                  >
                    {displayedAvatarSrc ? (
                      <img
                        src={displayedAvatarSrc}
                        alt={displayData.handle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[var(--color-text-primary)]">
                        {displayData.handle?.substring(0, 2).toUpperCase() ||
                          "??"}
                      </div>
                    )}
                    {
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/45" />
                    }
                    {!pendingAvatarFile && (
                      <label
                        htmlFor="avatar-upload-input"
                        className="absolute left-1/2 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/75 text-white opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:bg-black"
                        aria-label="Upload profile image"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ImagePlus className="h-4 w-4" />
                        <input
                          id="avatar-upload-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarSelect(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    {pendingAvatarFile && (
                      <>
                        <button
                          type="button"
                          aria-label="Discard avatar change"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAvatarDiscard();
                          }}
                          className="absolute left-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-lg transition-colors hover:bg-black"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Confirm avatar change"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleAvatarConfirm();
                          }}
                          className="absolute right-1.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-lg transition-colors hover:bg-[var(--color-accent-hover)]"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </AvatarRing>
              );
            })()}
          </div>

          <div className="z-10 flex-1 pb-1 text-center md:text-left">
            <div className="mb-0.5 flex items-center justify-center gap-2 md:justify-start">
              <h1 className="text-h2 text-[var(--color-text-primary)]">
                {displayData.full_name || displayData.handle}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                <User className="h-3 w-3" />
                Crew
              </span>
            </div>
            <p className="mb-3 text-body-sm text-[var(--color-text-secondary)]">
              @{displayData.handle}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-5 md:justify-start">
              <div className="text-center">
                <span className="block text-h4 text-[var(--color-text-primary)]">
                  {initialProfile.created_at
                    ? new Date(initialProfile.created_at).getFullYear()
                    : "—"}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Joined
                </span>
              </div>
              <div className="h-7 w-px bg-[var(--color-line)]" />
              <div className="max-w-[110px] text-center">
                <span className="block truncate text-h4 text-[var(--color-text-primary)]">
                  {routeLabel ?? "—"}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Route
                </span>
              </div>
              <div className="h-7 w-px bg-[var(--color-line)]" />
              <div className="text-center">
                <span className="block text-h4 text-[var(--color-text-primary)]">
                  {followerCount ?? "—"}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Followers
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--color-line)]" />

        {/* ── Profile details section ──────────────────────────────────── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3">Profile Details</h2>
            {!isEditing ? (
              <button
                type="button"
                aria-label="Edit profile details"
                onClick={() => setIsEditing(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Discard profile changes"
                  onClick={handleCancel}
                  disabled={isSaving}
                  id="profile-cancel-btn"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Save profile changes"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  id="profile-save-btn"
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                    hasChanges
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {isSaving ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
          <div>
            <label className="mb-1.5 block text-caption text-[var(--color-text-tertiary)]">
              Display Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
                placeholder="Your display name"
                maxLength={100}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] transition-all focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] focus:outline-none"
                disabled={isSaving}
              />
            ) : (
              <p className="text-body text-[var(--color-text-primary)]">
                {displayData.full_name || (
                  <span className="text-[var(--color-text-tertiary)]">
                    Not set
                  </span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-caption text-[var(--color-text-tertiary)]">
              Handle
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.handle}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, handle: e.target.value }))
                }
                placeholder="your_handle"
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 font-mono text-sm text-[var(--color-text-primary)] transition-all focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] focus:outline-none"
                disabled={isSaving}
              />
            ) : (
              <p className="text-body font-mono text-[var(--color-text-primary)]">
                @{displayData.handle}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-caption text-[var(--color-text-tertiary)]">
              Bio
            </label>
            {isEditing ? (
              <>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] transition-all focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] focus:outline-none"
                  disabled={isSaving}
                />
                <div className="mt-1 flex justify-end">
                  <span
                    className={`text-xs font-mono ${formData.bio.length > 450 ? "text-[var(--color-warning)]" : "text-[var(--color-text-tertiary)]"}`}
                  >
                    {formData.bio.length}/500
                  </span>
                </div>
              </>
            ) : (
              <p className="whitespace-pre-wrap text-body text-[var(--color-text-primary)]">
                {displayData.bio || (
                  <span className="text-[var(--color-text-tertiary)]">
                    No bio yet
                  </span>
                )}
              </p>
            )}
          </div>
          </div>
        </section>

        <MediaLightbox
          isOpen={!!lightbox}
          src={lightbox?.src || ""}
          type={lightbox?.type || "image"}
          onClose={() => setLightbox(null)}
        />

        <div className="mt-8 border-t border-[var(--color-line)]" />

        <ProfileGallery userId={initialProfile.id} />
      </div>
    </div>
  );
}
