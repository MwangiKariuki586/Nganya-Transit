import { useMemo, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import Button from "@/components/ui/Button";
import BottomSheet from "@/components/ui/BottomSheet";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Settings, Camera, MapPin, Clock, Calendar } from "lucide-react";
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
import type { ProfileRouteData } from "@/modules/fan/services/route-data";

interface ProfileScreenProps {
  data: ProfileRouteData;
}

export default function ProfileScreen({ data }: ProfileScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [showAllSightings, setShowAllSightings] = useState(false);
  const [showAllFollowing, setShowAllFollowing] = useState(false);
  const useSheet = typeof window !== "undefined" && window.innerWidth < 768;
  const { authUser, profile, followedNganyas, liveNganyas, userSightings } =
    data;

  const displayName = useMemo(
    () =>
      profile?.full_name ||
      authUser?.user_metadata?.full_name ||
      "Matwana Member",
    [profile, authUser],
  );
  const handle = useMemo(
    () => formatHandle(profile?.handle || authUser?.user_metadata?.handle),
    [profile, authUser],
  );
  const avatarUrl =
    profile?.avatar_url || authUser?.user_metadata?.avatar_url || null;
  const joinedLabel = formatMonthYear(
    profile?.created_at || authUser?.created_at,
  );

  // Calculate user credibility and activity metrics
  const credibility = useMemo(
    () => getUserCredibility(userSightings),
    [userSightings],
  );

  // Separate fresh and expired sightings
  const { freshSightings, expiredSightings } = useMemo(() => {
    const fresh: any[] = [];
    const expired: any[] = [];

    userSightings.forEach((sighting) => {
      const strength = getSignalStrength(sighting.created_at);
      if (strength === "expired") {
        expired.push(sighting);
      } else {
        fresh.push(sighting);
      }
    });

    return { freshSightings: fresh, expiredSightings: expired };
  }, [userSightings]);

  // Sort followed nganyas by activity (fresh first)
  const sortedFollowedNganyas = useMemo(() => {
    return [...followedNganyas].sort((a, b) => {
      const aSightings = liveNganyas.filter(
        (live: any) => live.nganya_id === (a.nganyas?.id || a.id),
      );
      const bSightings = liveNganyas.filter(
        (live: any) => live.nganya_id === (b.nganyas?.id || b.id),
      );

      const aSignal = getNganyaActivitySignal(aSightings);
      const bSignal = getNganyaActivitySignal(bSightings);

      // Fresh first
      if (aSignal.isFresh && !bSignal.isFresh) return -1;
      if (!aSignal.isFresh && bSignal.isFresh) return 1;

      // Then by count
      return bSignal.count - aSignal.count;
    });
  }, [followedNganyas, liveNganyas]);

  // Pagination logic
  const ITEMS_PER_PAGE = 5;
  const displayedSightings = showAllSightings
    ? [...freshSightings, ...expiredSightings]
    : [...freshSightings, ...expiredSightings].slice(0, ITEMS_PER_PAGE);
  const hasMoreSightings =
    freshSightings.length + expiredSightings.length > ITEMS_PER_PAGE;

  const displayedFollowing = showAllFollowing
    ? sortedFollowedNganyas
    : sortedFollowedNganyas.slice(0, ITEMS_PER_PAGE);
  const hasMoreFollowing = sortedFollowedNganyas.length > ITEMS_PER_PAGE;

  // Map nganya data to Card props format (same as homepage)
  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;

    const nganyaData = dbNganya.nganyas || dbNganya;
    const nganyaId = nganyaData.id || nganyaData.nganya_id;
    const isLive = liveNganyas.some(
      (liveNganya: any) => liveNganya.nganya_id === nganyaId,
    );

    // Get activity signal for this nganya
    const nganyaSightings = liveNganyas.filter(
      (live: any) => live.nganya_id === nganyaId,
    );
    const activitySignal = getNganyaActivitySignal(nganyaSightings);

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
      imageUrl:
        nganyaData.nganya_media?.[0]?.media_url ||
        nganyaData.image_url ||
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
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

  // Auth is now guaranteed by route loader, so this check is just for type safety
  if (!authUser) {
    return null; // This should never happen due to route-level redirect
  }

  return (
    <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 space-y-10">
      {/* Header - Identity + Credibility */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[var(--glass-border)] object-cover"
            />
          ) : (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[var(--glass-border)] bg-[var(--glass-bg)] flex items-center justify-center text-xl font-bold text-[var(--color-text-primary)]">
              {getInitials(displayName)}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center border-2 border-[var(--color-bg-base)]">
            <Camera className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <h1 className="text-h2 text-[var(--color-text-primary)]">
              {displayName}
            </h1>
            <CredibilityBadge
              level={credibility.level}
              label={credibility.label}
            />
          </div>
          <p className="text-body-sm text-[var(--color-text-secondary)] mb-1">
            {handle}
          </p>

          {credibility.lastActivity && (
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-[var(--color-text-tertiary)] mb-4">
              <Clock className="w-3 h-3" />
              <span>Last spotted {credibility.lastActivity}</span>
            </div>
          )}

          <div className="flex items-center justify-center md:justify-start gap-6">
            <div className="text-center">
              <span className="text-h4 text-[var(--color-text-primary)] block">
                {credibility.sightingsLast7d}
              </span>
              <span className="text-caption text-[var(--color-text-tertiary)]">
                Last 7d
              </span>
            </div>
            <div className="w-px h-8 bg-[var(--color-line)]" />
            <div className="text-center">
              <span className="text-h4 text-[var(--color-text-primary)] block">
                {followedNganyas.length}
              </span>
              <span className="text-caption text-[var(--color-text-tertiary)]">
                Following
              </span>
            </div>
            <div className="w-px h-8 bg-[var(--color-line)]" />
            <div className="text-center">
              <span className="text-h4 text-[var(--color-text-primary)] block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {joinedLabel}
              </span>
              <span className="text-caption text-[var(--color-text-tertiary)]">
                Joined
              </span>
            </div>
          </div>
        </div>

        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Settings className="w-4 h-4" />
          Edit Profile
        </Button>
      </div>

      {/* Your Sightings - Signal Intelligence */}
      <section>
        <h2 className="text-h3 !mb-3">Your Sightings</h2>
        {userSightings.length > 0 ? (
          <>
            <div className="space-y-2">
              {/* Fresh Sightings */}
              {displayedSightings.map((sighting) => {
                const strength = getSignalStrength(sighting.created_at);
                const recency = formatRecencyLabel(sighting.created_at);
                const isExpired = strength === "expired";

                return (
                  <div
                    key={sighting.id}
                    className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all ${
                      isExpired ? "opacity-60" : ""
                    }`}
                    style={{
                      boxShadow:
                        strength === "fresh" ? "var(--glow-accent-sm)" : "none",
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
                          {sighting.nganya?.corridors?.name || "Unknown route"}
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
                    : `Show ${freshSightings.length + expiredSightings.length - ITEMS_PER_PAGE} More`}
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

      {/* Divider */}
      <div className="border-t border-[var(--color-line)]" />

      {/* Following - Actionable Intelligence */}
      <section>
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

      {useSheet ? (
        <BottomSheet
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Profile"
        >
          <EditProfileForm
            fullName={displayName}
            handle={handle.replace(/^@/, "")}
            avatarUrl={avatarUrl}
            onClose={() => setEditOpen(false)}
            onSaved={async (payload) => {
              await updateCurrentUserProfile(payload);
              await router.invalidate();
              setEditOpen(false);
            }}
          />
        </BottomSheet>
      ) : (
        <Modal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Profile"
        >
          <EditProfileForm
            fullName={displayName}
            handle={handle.replace(/^@/, "")}
            avatarUrl={avatarUrl}
            onClose={() => setEditOpen(false)}
            onSaved={async (payload) => {
              await updateCurrentUserProfile(payload);
              await router.invalidate();
              setEditOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function EditProfileForm({
  fullName,
  handle,
  avatarUrl,
  onClose,
  onSaved,
}: {
  fullName: string;
  handle: string;
  avatarUrl: string | null;
  onClose: () => void;
  onSaved: (payload: { full_name: string; handle: string }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(fullName);
  const [username, setUsername] = useState(handle);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSaved({
        full_name: displayName,
        handle: username,
      });
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-sm font-bold text-[var(--color-text-primary)]">
            {getInitials(displayName)}
          </div>
        )}
        <div className="text-sm text-[var(--color-text-tertiary)]">
          Avatar upload stays on the current auth/profile storage backlog.
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-caption text-[var(--color-text-tertiary)] mb-1.5 block">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
          />
        </div>
        <div>
          <label className="text-caption text-[var(--color-text-tertiary)] mb-1.5 block">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value.replace(/\s+/g, ""))
            }
            className="w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-md)] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          isLoading={isSaving}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
