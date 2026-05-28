import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Card from "@/components/ui/Card";
import LiveBadge from "@/components/ui/LiveBadge";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import { NganyaGallery } from "@/modules/fan/components/NganyaGallery";
import { FanSection } from "@/modules/fan/components/FanSection";
import {
  getNganyaCrewGalleryServerFn,
  getNganyaCrewProfileServerFn,
} from "@/shared/server-fns/profile-gallery";
import { updateCrewProfileServerFn } from "@/shared/server-fns/crew-profile";
import { replaceAvatar } from "@/lib/storage/profile-media";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useToast } from "@/components/ui/ToastContainer";
import { PulseLoader } from "@/components/ui/loading";
import { retryWithBackoff, isNetworkError } from "@/lib/utils/retry";
import { compressImage } from "@/lib/utils/image-compress";
import { vibeTagColors } from "@/lib/mockData";
import { getNganyaBySlug, getNganyasByCorridor } from "@/lib/queries/discover";
import { getLiveNow } from "@/lib/queries/live";
import { getCorridorSightings } from "@/lib/queries/sightings";
import {
  mapNganyaRecordToCardData,
  type FanCardData,
} from "@/modules/fan/lib/nganya-card";
import type {
  FanLiveNganyaRecord,
  FanMediaRecord,
  FanNganyaRecord,
  FanRecentSightingRecord,
} from "@/modules/fan/lib/fan-data";
import {
  followNganya,
  getMyFollows,
  unfollowNganya,
} from "@/lib/queries/follows";
import { formatRelativeTime } from "@/lib/formatters";
import { Heart, Share2, Eye, Camera, ChevronLeft } from "lucide-react";

interface CrewGalleryItem {
  id: string;
  media_url: string;
  media_type?: string | null;
}

interface CrewProfileRecord {
  id?: string | null;
  avatar_url?: string | null;
  cover_media_url?: string | null;
  cover_media_type?: "image" | "video" | null;
}

interface NganyaDetailRecord extends FanNganyaRecord {
  bio?: string | null;
  status?: string | null;
}

interface SightingConfidenceLevelRecord {
  confidence_level?: "HIGH" | "MEDIUM" | "LOW" | "HIGH_CONFIDENCE" | string | null;
}

interface NganyaDetailSightingRecord extends FanRecentSightingRecord {
  media_urls?: string[] | null;
  confidence?: SightingConfidenceLevelRecord | null;
}

export default function NganyaDetailScreen() {
  const navigate = useNavigate();
  const { slug } = useParams({ from: "/(fan)/nganya/$slug" });
  const { session } = useAuthSession();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [nganya, setNganya] = useState<NganyaDetailRecord | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [nganyaSightings, setNganyaSightings] = useState<NganyaDetailSightingRecord[]>([]);
  const [relatedNganyas, setRelatedNganyas] = useState<FanNganyaRecord[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [crewGalleryItems, setCrewGalleryItems] = useState<CrewGalleryItem[]>([]);
  const [crewProfile, setCrewProfile] = useState<CrewProfileRecord | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Recomputes whenever session or crewProfile loads — both are async
  const isOwner = useMemo(
    () =>
      !!session?.user?.id &&
      !!crewProfile?.id &&
      session.user.id === crewProfile.id,
    [session, crewProfile],
  );

  useEffect(() => {
    async function loadNganya() {
      setIsLoading(true);
      try {
        const data = (await getNganyaBySlug(slug)) as NganyaDetailRecord | null;
        if (!data) {
          setNganya(null);
          return;
        }

        setNganya(data);

        const [
          liveRes,
          corridorSightings,
          related,
          myFollows,
          crewGallery,
          crewProfileData,
        ] = await Promise.all([
          getLiveNow(data.corridor_id),
          getCorridorSightings(data.corridor_id),
          getNganyasByCorridor(data.corridor_id, data.id),
          getMyFollows().catch(() => []),
          getNganyaCrewGalleryServerFn({ data: { nganyaId: data.id } }).catch(
            () => [],
          ),
          getNganyaCrewProfileServerFn({ data: { nganyaId: data.id } }).catch(
            () => null,
          ),
        ]);

        setCrewGalleryItems(crewGallery);
        setCrewProfile(crewProfileData);
        setAvatarPreviewUrl(crewProfileData?.avatar_url ?? null);

        setIsLive(
          (liveRes || []).some(
            (liveNganya: FanLiveNganyaRecord) => liveNganya.nganya_id === data.id,
          ) || data.status === "LIVE",
        );
        setNganyaSightings(
          ((corridorSightings || []) as NganyaDetailSightingRecord[]).filter(
            (sighting) => sighting.nganya_id === data.id,
          ),
        );
        setRelatedNganyas((related || []) as FanNganyaRecord[]);
        setIsFollowing(
          (myFollows || []).some((follow) => follow.nganya_id === data.id),
        );
      } catch (error) {
        console.error("Failed to load nganya data", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadNganya();
  }, [slug]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session?.user?.id || !session?.access_token) return;

    // Optimistic preview
    const preview = URL.createObjectURL(file);
    setAvatarPreviewUrl(preview);
    setIsUploadingAvatar(true);

    try {
      const compressed = await compressImage(file, {
        maxWidthOrHeight: 400,
        quality: 0.88,
        maxSizeMB: 1,
      }).catch(() => file);

      const result = await retryWithBackoff(
        () =>
          replaceAvatar(
            compressed,
            session.user.id,
            crewProfile?.avatar_url || undefined,
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

      URL.revokeObjectURL(preview);
      setAvatarPreviewUrl(result.url);
      setCrewProfile((prev) => ({ ...prev, avatar_url: result.url }));
      toast.success("Avatar updated!");
    } catch (err) {
      URL.revokeObjectURL(preview);
      setAvatarPreviewUrl(crewProfile?.avatar_url ?? null);
      const message =
        err instanceof Error ? err.message : "Please try again.";
      toast.error(
        "Upload failed",
        isNetworkError(err) ? "Network error. Please try again." : message,
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!nganya) return;

    try {
      if (isFollowing) {
        await unfollowNganya(nganya.id);
        setIsFollowing(false);
      } else {
        await followNganya(nganya.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Follow action requires authentication", error);
      navigate({ to: "/signin" });
    }
  };

  if (isLoading) {
    return (
      <PulseLoader
        containerClassName="page-container py-16"
        dotClassName="h-8 w-8"
      />
    );
  }

  if (!nganya) {
    return (
      <div className="page-container py-16 text-center">
        <h2 className="text-h2 text-[var(--color-text-primary)] mb-2">
          Nganya not found
        </h2>
        <p className="text-body text-[var(--color-text-secondary)] mb-6">
          The route exists, but this build is not resolving from the current
          slug.
        </p>
        <Link to="/">
          <Button variant="secondary">Back to Discover</Button>
        </Link>
      </div>
    );
  }

  const corridorName = nganya.corridors?.name || "Unknown Route";
  // Cover: prefer crew's cover photo, fall back to first nganya_media, then placeholder
  const coverSrc: string =
    crewProfile?.cover_media_url || nganya.nganya_media?.[0]?.media_url || "";
  const coverType: "image" | "video" = crewProfile?.cover_media_type || "image";
  // Avatar: prefer local preview (after upload), then crew's avatar, fall back to first nganya_media
  const avatarSrc: string =
    avatarPreviewUrl ||
    crewProfile?.avatar_url ||
    nganya.nganya_media?.[0]?.media_url ||
    "";
  const tags = nganya.tags || [];
  const isNewBuild = tags.includes("NEW_BUILD");

  // Merge nganya_media (admin-uploaded at registration) with crew profile_media,
  // deduping by media_url so the same photo never appears twice.
  const nganyaMedia: FanMediaRecord[] = nganya.nganya_media || [];
  const seenUrls = new Set(nganyaMedia.map((m) => m.media_url));
  const mergedGallery = [
    ...nganyaMedia,
    ...crewGalleryItems.filter((m) => !seenUrls.has(m.media_url)),
  ];
  const mediaCount = mergedGallery.length;
  const relatedCards = relatedNganyas
    .map((relatedNganya) =>
      mapNganyaRecordToCardData(relatedNganya, {
        lastSeen: "Recently",
      }),
    )
    .filter(Boolean) as FanCardData[];

  return (
    <div className="animate-slide-up">
      {/* ── Hero cover ─────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(180px, 30vw, 320px)" }}
      >
        {coverSrc ? (
          coverType === "video" ? (
            <video
              src={coverSrc}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={coverSrc}
              alt={nganya.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 120% 100% at 60% 40%, var(--theme-accent-vignette) 0%, rgba(0,240,255,0.08) 50%, transparent 80%), var(--color-bg-elevated)",
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

        <Link
          to="/"
          className="absolute top-4 left-4 md:top-6 md:left-6 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors no-underline"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        <button
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors cursor-pointer"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* ── Profile header (negative margin pulls up over cover) ───────────── */}
      <div className="page-container" style={{ marginTop: "-56px" }}>
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:gap-6">
          {/* Nganya avatar — crew's avatar_url, fallback to initials */}
          <div className="relative z-10 shrink-0">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-[var(--glass-bg)] ring-2 ring-[var(--color-bg-base)]">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={nganya.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-[var(--color-text-primary)]">
                  {nganya.name?.substring(0, 2).toUpperCase() || "??"}
                </div>
              )}

              {/* Upload overlay — only for the assigned crew member */}
              {isOwner && (
                <label
                  htmlFor="nganya-avatar-input"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 transition-opacity hover:opacity-100 opacity-60"
                >
                  {isUploadingAvatar ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                  <input
                    id="nganya-avatar-input"
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Name + stats */}
          <div className="z-10 flex-1 pb-1 text-center md:text-left">
            <div className="mb-0.5 flex items-center justify-center gap-2 md:justify-start">
              <h1 className="text-h2 text-[var(--color-text-primary)]">
                {nganya.name}
              </h1>
              {isLive && <LiveBadge />}
              {isNewBuild && (
                <span className="animate-shimmer px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-green-soft)] text-[var(--color-green)] text-[10px] font-bold tracking-wider uppercase border border-[rgba(57,255,20,0.2)]">
                  New Build
                </span>
              )}
              {nganya.is_verified && <ConfidenceBadge level="HIGH" />}
            </div>
            <p className="mb-3 text-body-sm text-[var(--color-text-secondary)]">
              {corridorName}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-5 md:justify-start">
              <div className="text-center">
                <span className="block text-h4 text-[var(--color-text-primary)]">
                  {nganyaSightings.length}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Sightings
                </span>
              </div>
              <div className="h-7 w-px bg-[var(--color-line)]" />
              <div className="max-w-[110px] text-center">
                <span className="block truncate text-h4 text-[var(--color-text-primary)]">
                  {nganyaSightings[0]?.created_at
                    ? formatRelativeTime(nganyaSightings[0].created_at)
                    : "—"}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Last seen
                </span>
              </div>
              <div className="h-7 w-px bg-[var(--color-line)]" />
              <div className="text-center">
                <span className="block text-h4 text-[var(--color-text-primary)]">
                  {mediaCount}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Photos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap justify-between">
          <Button
            variant={isFollowing ? "secondary" : "primary"}
            onClick={handleFollowToggle}
          >
            <Heart
              className="w-4 h-4"
              fill={isFollowing ? "currentColor" : "none"}
            />
            {isFollowing ? "Following" : "Follow"}
          </Button>

          <Link to="/spot" className="no-underline">
            <Button variant="secondary">
              <Camera className="w-4 h-4" />
              Spot
            </Button>
          </Link>
        </div>

        <div className="mt-8 border-t border-[var(--color-line)]" />

        {/* ── Profile Details ─────────────────────────────────────────────── */}
        <FanSection title="Profile Details" withDivider={false}>
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-caption text-[var(--color-text-tertiary)]">
                Name
              </label>
              <p className="text-body text-[var(--color-text-primary)]">
                {nganya.name}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-caption text-[var(--color-text-tertiary)]">
                Corridor
              </label>
              <p className="text-body text-[var(--color-text-primary)]">
                {corridorName}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-caption text-[var(--color-text-tertiary)]">
                Bio
              </label>
              <p className="whitespace-pre-wrap text-body text-[var(--color-text-primary)]">
                {nganya.bio ? (
                  nganya.bio
                ) : (
                  <span className="text-[var(--color-text-tertiary)]">
                    Operates on the {corridorName} corridor with{" "}
                    {nganya.is_verified ? "verified" : "community"} status and a
                    culture profile shaped by recent sightings.
                  </span>
                )}
              </p>
            </div>
          </div>
        </FanSection>

        {/* ── Vibes ───────────────────────────────────────────────────────── */}
        {tags.length > 0 && (
          <>
            <div className="mt-8 border-t border-[var(--color-line)]" />
            <FanSection title="Vibes" withDivider={false}>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <Chip
                    key={tag}
                    label={tag}
                    variant="vibe"
                    color={vibeTagColors[tag] || undefined}
                  />
                ))}
              </div>
            </FanSection>
          </>
        )}

        <div className="mt-8 border-t border-[var(--color-line)]" />

        {/* ── Gallery ─────────────────────────────────────────────────────── */}
        <FanSection
          withDivider={false}
          title={
            <>
              Gallery{" "}
              <span className="text-sm text-[var(--color-text-tertiary)]">
                ({mediaCount}/30)
              </span>
            </>
          }
        >
          <NganyaGallery items={mergedGallery} />
        </FanSection>

        <div className="mt-8 border-t border-[var(--color-line)]" />

        {/* ── Recent Sightings ────────────────────────────────────────────── */}
        <FanSection title="Recent Sightings" withDivider={false}>
          {nganyaSightings.length > 0 ? (
            <div className="space-y-2">
              {nganyaSightings.slice(0, 5).map((sighting) => (
                <div
                  key={sighting.id}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text-primary)]">
                        {sighting.user?.handle || "Anonymous"}
                      </span>
                      <ConfidenceBadge
                        level={
                          sighting.confidence?.confidence_level === "LOW"
                            ? "LOW"
                            : sighting.confidence?.confidence_level === "MEDIUM"
                              ? "MEDIUM"
                              : "HIGH"
                        }
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {corridorName} - {formatRelativeTime(sighting.created_at)}
                    </span>
                  </div>
                  {sighting.media_urls?.length > 0 && (
                    <Eye className="w-3.5 h-3.5 text-[var(--color-cyan)]" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-[var(--color-text-tertiary)] py-4">
              No recent sightings yet. Be the first to log one.
            </p>
          )}
        </FanSection>

        {/* ── More from Corridor ──────────────────────────────────────────── */}
        {relatedCards.length > 0 && (
          <>
            <div className="mt-8 border-t border-[var(--color-line)]" />
            <FanSection
              title={`More from ${corridorName}`}
              className="pb-10 md:pb-16"
              withDivider={false}
            >
              <div className="grid-cards">
                {relatedCards.map((relatedCard) => (
                  <Card
                    key={relatedCard.id}
                    nganya={relatedCard}
                    variant="standard"
                  />
                ))}
              </div>
            </FanSection>
          </>
        )}
      </div>
    </div>
  );
}
