import { useMemo, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import MediaLightbox from "@/components/ui/MediaLightbox";
import {
  Check,
  ImagePlus,
  Pencil,
  X,
  Camera,
  MapPin,
  Clock,
} from "lucide-react";
import SignalBadge from "@/components/ui/SignalBadge";
import CredibilityBadge from "@/components/ui/CredibilityBadge";
import {
  formatHandle,
  formatMonthYear,
  getInitials,
  toNganyaSlug,
} from "@/lib/formatters";
import {
  getSignalStrength,
  formatRecencyLabel,
  getUserCredibility,
  getNganyaActivitySignal,
} from "@/lib/signal-intelligence";
import { updateCurrentUserProfile } from "@/lib/queries/profile";
import { replaceAvatar, replaceCoverMedia } from "@/lib/storage/profile-media";
import { retryWithBackoff, isNetworkError } from "@/lib/utils/retry";
import { compressImage, formatFileSize } from "@/lib/utils/image-compress";
import { useToast } from "@/components/ui/ToastContainer";
import type { ProfileRouteData } from "@/modules/fan/services/route-data";
import { pickPrimaryNganyaImageUrl } from "@/lib/images/nganya-images";

interface ProfileScreenProps {
  data: ProfileRouteData;
}

export default function ProfileScreen({ data }: ProfileScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const toast = useToast();

  const [showAllSightings, setShowAllSightings] = useState(false);
  const [showAllFollowing, setShowAllFollowing] = useState(false);

  // ── Profile edit state ────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { authUser, profile, followedNganyas, liveNganyas, userSightings } =
    data;

  const displayName =
    profile?.full_name ||
    authUser?.user_metadata?.full_name ||
    "Matwana Member";
  const handle = formatHandle(
    profile?.handle || authUser?.user_metadata?.handle,
  );
  const avatarUrl =
    profile?.avatar_url || authUser?.user_metadata?.avatar_url || null;
  const joinedLabel = formatMonthYear(
    profile?.created_at || authUser?.created_at,
  );

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || authUser?.user_metadata?.full_name || "",
    handle: profile?.handle || authUser?.user_metadata?.handle || "",
  });
  const [originalData, setOriginalData] = useState(formData);

  // ── Avatar staged upload state ────────────────────────────────────────────
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<
    string | null
  >(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    avatarUrl,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);

  // ── Cover upload state ────────────────────────────────────────────────────
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    profile?.cover_media_url || null,
  );
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const [lightbox, setLightbox] = useState<{
    src: string;
    type: "image" | "video";
  } | null>(null);

  const displayedAvatarSrc = pendingAvatarPreviewUrl || avatarPreviewUrl;
  const currentCoverSrc = coverPreviewUrl || profile?.cover_media_url || "";
  const hasChanges =
    formData.full_name !== originalData.full_name ||
    formData.handle !== originalData.handle;

  // ── Avatar handlers ───────────────────────────────────────────────────────
  const handleAvatarSelect = (file: File) => {
    if (pendingAvatarPreviewUrl) URL.revokeObjectURL(pendingAvatarPreviewUrl);
    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleAvatarDiscard = () => {
    if (pendingAvatarPreviewUrl) URL.revokeObjectURL(pendingAvatarPreviewUrl);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
  };

  const handleAvatarConfirm = async () => {
    if (!pendingAvatarFile || !pendingAvatarPreviewUrl || !authUser?.id) return;

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
            authUser.id,
            profile?.avatar_url || undefined,
          ),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            toast.info(
              "Retrying upload...",
              `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue." : ""}`,
            );
          },
        },
      );

      await updateCurrentUserProfile({ avatar_url: result.url });

      clearInterval(progressInterval);
      setAvatarUploadProgress(100);
      setAvatarPreviewUrl(result.url);
      URL.revokeObjectURL(previewUrl);
      toast.success("Avatar updated!");
      await router.invalidate();
    } catch (err: any) {
      clearInterval(progressInterval);
      setAvatarUploadProgress(0);
      setAvatarPreviewUrl(previousAvatarUrl);
      URL.revokeObjectURL(previewUrl);
      toast.error(
        "Upload failed",
        isNetworkError(err) ? "Network error." : err.message,
      );
    } finally {
      setIsUploadingAvatar(false);
      setAvatarUploadProgress(0);
    }
  };

  // ── Cover handlers ────────────────────────────────────────────────────────
  const handleCoverSelect = (file: File) => {
    setSelectedCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const handleCoverDiscard = () => {
    setSelectedCoverFile(null);
    setCoverPreviewUrl(profile?.cover_media_url || null);
  };

  const handleCoverConfirm = async () => {
    if (!selectedCoverFile || !authUser?.id) return;

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
            authUser.id,
            profile?.cover_media_url || undefined,
          ),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            toast.info(
              "Retrying upload...",
              `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue." : ""}`,
            );
          },
        },
      );

      await updateCurrentUserProfile({
        cover_media_url: result.url,
        cover_media_type: result.type,
      });

      clearInterval(progressInterval);
      setCoverUploadProgress(100);
      setCoverPreviewUrl(result.url);
      setSelectedCoverFile(null);
      toast.success("Cover updated!");
      await router.invalidate();
    } catch (err: any) {
      clearInterval(progressInterval);
      setCoverUploadProgress(0);
      setCoverPreviewUrl(profile?.cover_media_url || null);
      setSelectedCoverFile(null);
      toast.error(
        "Cover upload failed",
        isNetworkError(err) ? "Network error." : err.message,
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      await updateCurrentUserProfile({
        full_name: formData.full_name,
        handle: formData.handle,
      });
      setOriginalData(formData);
      setIsEditing(false);
      await router.invalidate();
    } catch (err: any) {
      setEditError(err?.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setEditError(null);
    setIsEditing(false);
  };

  // ── Credibility + sightings ───────────────────────────────────────────────
  const credibility = useMemo(
    () => getUserCredibility(userSightings),
    [userSightings],
  );

  const { freshSightings, expiredSightings } = useMemo(() => {
    const fresh: any[] = [];
    const expired: any[] = [];
    userSightings.forEach((s) => {
      getSignalStrength(s.created_at) === "expired"
        ? expired.push(s)
        : fresh.push(s);
    });
    return { freshSightings: fresh, expiredSightings: expired };
  }, [userSightings]);

  const sortedFollowedNganyas = useMemo(() => {
    return [...followedNganyas].sort((a, b) => {
      const aSignal = getNganyaActivitySignal(
        liveNganyas.filter((l: any) => l.nganya_id === (a.nganyas?.id || a.id)),
      );
      const bSignal = getNganyaActivitySignal(
        liveNganyas.filter((l: any) => l.nganya_id === (b.nganyas?.id || b.id)),
      );
      if (aSignal.isFresh && !bSignal.isFresh) return -1;
      if (!aSignal.isFresh && bSignal.isFresh) return 1;
      return bSignal.count - aSignal.count;
    });
  }, [followedNganyas, liveNganyas]);

  const ITEMS_PER_PAGE = 5;
  const allSightings = [...freshSightings, ...expiredSightings];
  const displayedSightings = showAllSightings
    ? allSightings
    : allSightings.slice(0, ITEMS_PER_PAGE);
  const hasMoreSightings = allSightings.length > ITEMS_PER_PAGE;
  const displayedFollowing = showAllFollowing
    ? sortedFollowedNganyas
    : sortedFollowedNganyas.slice(0, ITEMS_PER_PAGE);
  const hasMoreFollowing = sortedFollowedNganyas.length > ITEMS_PER_PAGE;

  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;
    const nganyaData = dbNganya.nganyas || dbNganya;
    const nganyaId = nganyaData.id || nganyaData.nganya_id;
    const isLive = liveNganyas.some((l: any) => l.nganya_id === nganyaId);
    const activitySignal = getNganyaActivitySignal(
      liveNganyas.filter((l: any) => l.nganya_id === nganyaId),
    );
    return {
      id: nganyaId,
      slug:
        nganyaData.slug ||
        nganyaData.nganya_slug ||
        toNganyaSlug(nganyaData.nganya_name || nganyaData.name),
      name: nganyaData.nganya_name || nganyaData.name,
      corridor:
        nganyaData.corridor_name ||
        nganyaData.corridors?.name ||
        "Unknown Route",
      vibeTags: nganyaData.vibeTags || nganyaData.tags || [],
      imageUrl: pickPrimaryNganyaImageUrl(nganyaData) ?? '',
      isLive,
      isNewBuild:
        nganyaData.tags?.includes("NEW_BUILD") || nganyaData.is_new_build,
      isVerified: nganyaData.is_verified,
      followers: nganyaData.follower_count || 0,
      sightingsToday: nganyaData.sighting_count_today || 0,
      lastSeen: activitySignal.isFresh
        ? activitySignal.label
        : isLive
          ? "Live now"
          : activitySignal.label,
    };
  };

  if (!authUser) return null;

  return (
    <div className="pb-10 md:pb-16">
      {/* Progress bar */}
      {(isUploadingAvatar || isUploadingCover) && (
        <div className="fixed left-0 right-0 z-[var(--z-nav)] h-0.5 bg-black/20 top-0 md:top-[var(--top-nav-height)]">
          <div
            className="h-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
            style={{
              width: `${isUploadingCover ? coverUploadProgress : avatarUploadProgress}%`,
            }}
          />
        </div>
      )}

      {/* ── Cover ────────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(180px, 30vw, 320px)" }}
      >
        {currentCoverSrc ? (
          <img
            src={currentCoverSrc}
            alt="Cover"
            className="absolute inset-0 h-full w-full object-cover"
          />
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

        {/* Cover controls — top-right */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {selectedCoverFile && !isUploadingCover ? (
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
            <div className="relative overflow-hidden rounded-full border border-white/20 bg-black/70 text-white shadow-lg transition-colors hover:bg-black/85">
              <input
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
      </div>

      {/* ── Profile header ───────────────────────────────────────────────── */}
      <div className="page-container" style={{ marginTop: "-56px" }}>
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:gap-6">
          {/* Avatar with staged upload */}
          <div className="relative z-10 shrink-0">
            <div
              className="group relative h-24 w-24 overflow-hidden rounded-full bg-[var(--glass-bg)] ring-2 ring-[var(--color-bg-base)]"
              onClick={() =>
                !pendingAvatarFile &&
                displayedAvatarSrc &&
                setLightbox({ src: displayedAvatarSrc, type: "image" })
              }
              style={{
                cursor:
                  !pendingAvatarFile && displayedAvatarSrc
                    ? "pointer"
                    : "default",
              }}
            >
              {displayedAvatarSrc ? (
                <img
                  src={displayedAvatarSrc}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[var(--color-text-primary)]">
                  {getInitials(displayName)}
                </div>
              )}

              {/* Hover dim */}
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/45" />

              {/* Upload button — shown on hover when no pending file */}
              {!pendingAvatarFile && (
                <label
                  htmlFor="fan-avatar-input"
                  className="absolute left-1/2 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/75 text-white opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:bg-black"
                  aria-label="Upload profile image"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ImagePlus className="h-4 w-4" />
                  <input
                    id="fan-avatar-input"
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

              {/* Staged: discard (X) + confirm (tick) */}
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
          </div>

          {/* Name + stats */}
          <div className="z-10 flex-1 pb-1 text-center md:text-left">
            <div className="mb-0.5 flex items-center justify-center gap-2 md:justify-start">
              <h1 className="text-h2 text-[var(--color-text-primary)]">
                {displayName}
              </h1>
              <CredibilityBadge
                level={credibility.level}
                label={credibility.label}
              />
            </div>
            <p className="mb-3 text-body-sm text-[var(--color-text-secondary)]">
              {handle}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-5 md:justify-start">
              <div className="text-center">
                <span className="block text-h4 text-[var(--color-text-primary)]">
                  {credibility.sightingsLast7d}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Last 7d
                </span>
              </div>
              <div className="h-7 w-px bg-[var(--color-line)]" />
              <div className="text-center">
                <span className="block text-h4 text-[var(--color-text-primary)]">
                  {followedNganyas.length}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Following
                </span>
              </div>
              <div className="h-7 w-px bg-[var(--color-line)]" />
              <div className="text-center">
                <span className="block text-h4 text-[var(--color-text-primary)]">
                  {joinedLabel}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Joined
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--color-line)]" />

        {/* ── Profile Details (inline edit) ────────────────────────────── */}
        <section className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
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
                  aria-label="Discard changes"
                  onClick={handleCancel}
                  disabled={isSaving}
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
                  aria-label="Save changes"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                    hasChanges
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-secondary)]"
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

          <div>
            <label className="mb-1.5 block text-caption text-[var(--color-text-tertiary)]">
              Display Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, full_name: e.target.value }))
                }
                placeholder="Your display name"
                maxLength={100}
                disabled={isSaving}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] transition-all focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] focus:outline-none"
              />
            ) : (
              <p className="text-body text-[var(--color-text-primary)]">
                {displayName || (
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
                  setFormData((p) => ({ ...p, handle: e.target.value }))
                }
                placeholder="your_handle"
                maxLength={30}
                disabled={isSaving}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 font-mono text-sm text-[var(--color-text-primary)] transition-all focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] focus:outline-none"
              />
            ) : (
              <p className="text-body font-mono text-[var(--color-text-primary)]">
                {handle}
              </p>
            )}
          </div>

          {editError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {editError}
            </p>
          )}
        </section>

        <div className="mt-8 border-t border-[var(--color-line)]" />

        {/* ── Your Sightings ───────────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-h3 !mb-3">Your Sightings</h2>
          {userSightings.length > 0 ? (
            <>
              <div className="space-y-2">
                {displayedSightings.map((sighting) => {
                  const strength = getSignalStrength(sighting.created_at);
                  const recency = formatRecencyLabel(sighting.created_at);
                  const isExpired = strength === "expired";
                  return (
                    <div
                      key={sighting.id}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] transition-all ${isExpired ? "opacity-60" : ""}`}
                      style={{
                        boxShadow:
                          strength === "fresh"
                            ? "var(--glow-accent-sm)"
                            : "none",
                      }}
                    >
                      <Camera
                        className={`w-4 h-4 shrink-0 ${isExpired ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-accent)]"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-sm font-semibold ${isExpired ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}
                          >
                            {sighting.nganya?.name || "Nganya"}
                          </span>
                          {sighting.stage?.name && (
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              • {sighting.stage.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {sighting.nganya?.corridors?.name ||
                              "Unknown route"}
                          </span>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{recency}</span>
                        </div>
                      </div>
                      <SignalBadge strength={strength} />
                    </div>
                  );
                })}
              </div>
              {hasMoreSightings && (
                <div className="mt-3 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllSightings(!showAllSightings)}
                  >
                    {showAllSightings
                      ? "Show Less"
                      : `Show ${allSightings.length - ITEMS_PER_PAGE} More`}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              variant="no-sightings"
              title="No recent sightings"
              message="Start spotting nganyas to build your contributor profile."
              actionLabel="Spot Now"
              onAction={() => navigate({ to: "/spot" })}
            />
          )}
        </section>

        <div className="mt-8 border-t border-[var(--color-line)]" />

        {/* ── Following ────────────────────────────────────────────────── */}
        <section className="mt-8 pb-10 md:pb-16">
          <h2 className="text-h3 !mb-3">Following</h2>
          {followedNganyas.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedFollowing.map((nganya) => {
                  const cardProps = mapSupabaseToCardProps(nganya);
                  if (!cardProps) return null;
                  return (
                    <Card
                      key={cardProps.id}
                      nganya={cardProps as any}
                      variant="standard"
                      isFollowing
                    />
                  );
                })}
              </div>
              {hasMoreFollowing && (
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllFollowing(!showAllFollowing)}
                  >
                    {showAllFollowing
                      ? "Show Less"
                      : `Show ${sortedFollowedNganyas.length - ITEMS_PER_PAGE} More`}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              variant="no-following"
              title="Not following any nganyas"
              message="Discover and follow nganyas to track their live activity."
              actionLabel="Discover"
              onAction={() => navigate({ to: "/discover" })}
            />
          )}
        </section>
      </div>

      <MediaLightbox
        isOpen={!!lightbox}
        src={lightbox?.src || ""}
        type={lightbox?.type || "image"}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
