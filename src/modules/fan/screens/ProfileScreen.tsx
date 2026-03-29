import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import BottomSheet from "@/components/ui/BottomSheet";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Settings, Camera, MapPin, Clock, Calendar } from "lucide-react";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import {
  formatHandle,
  formatMonthYear,
  formatRelativeTime,
  getInitials,
  toNganyaSlug,
} from "@/lib/formatters";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useFollowStore } from "@/stores/useFollowStore";
import { useNganyaStore } from "@/stores/useNganyaStore";
import { useSightingStore } from "@/stores/useSightingStore";

export default function ProfileScreen() {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const useSheet = typeof window !== "undefined" && window.innerWidth < 768;

  // Store selectors
  const authUser = useProfileStore((state) => state.authUser);
  const profile = useProfileStore((state) => state.profile);
  const isLoadingProfile = useProfileStore((state) => state.isLoading);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const updateProfile = useProfileStore((state) => state.updateProfile);

  const followedNganyas = useFollowStore((state) => state.followedNganyas);
  const fetchFollowedNganyas = useFollowStore(
    (state) => state.fetchFollowedNganyas,
  );

  const liveNganyas = useNganyaStore((state) => state.liveNganyas);
  const fetchLiveNganyas = useNganyaStore((state) => state.fetchLiveNganyas);

  const userSightings = useSightingStore((state) => state.userSightings);
  const isLoadingSightings = useSightingStore(
    (state) => state.isLoadingUserSightings,
  );
  const fetchUserSightings = useSightingStore(
    (state) => state.fetchUserSightings,
  );

  const isLoading = isLoadingProfile || isLoadingSightings;

  useEffect(() => {
    fetchProfile();
    fetchFollowedNganyas();
    fetchLiveNganyas();
    fetchUserSightings();
  }, []);

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

  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;

    // Handle both direct nganya objects and follow objects with nested nganyas
    const nganyaData = dbNganya.nganyas || dbNganya;

    const isLive = liveNganyas.some(
      (liveNganya) => liveNganya.nganya_id === nganyaData.id,
    );

    return {
      id: nganyaData.nganya_id || nganyaData.id,
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
      lastSeen: isLive ? "Live now" : "Recently",
    };
  };

  if (isLoading) {
    return (
      <div className="page-container py-12 flex justify-center">
        <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
        <EmptyState
          variant="no-following"
          title="Sign in to open your profile"
          message="Your follows, sightings, and account settings live here once you sign in."
          actionLabel="Sign In"
          onAction={() => navigate({ to: "/signin" })}
        />
      </div>
    );
  }

  return (
    <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 space-y-10">
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
          <h1 className="text-h2 text-[var(--color-text-primary)]">
            {displayName}
          </h1>
          <p className="text-body-sm text-[var(--color-text-secondary)] mb-1">
            {handle}
          </p>
          <p className="text-body-sm text-[var(--color-text-tertiary)] mb-4">
            Role: {profile?.role || "fan"}
          </p>

          <div className="flex items-center justify-center md:justify-start gap-6">
            <div className="text-center">
              <span className="text-h4 text-[var(--color-text-primary)] block">
                {userSightings.length}
              </span>
              <span className="text-caption text-[var(--color-text-tertiary)]">
                Sightings
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

      <section>
        <h2 className="text-h3 mb-4">Your Sightings</h2>
        {userSightings.length > 0 ? (
          <div className="space-y-2">
            {userSightings.map((sighting) => (
              <div
                key={sighting.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)]"
              >
                <Camera className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {sighting.nganya?.name || "Nganya"}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {sighting.stage?.name ||
                        sighting.nganya?.corridors?.name ||
                        "Unknown route"}
                    </span>
                    <span>-</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(sighting.created_at)}</span>
                  </div>
                </div>
                <ConfidenceBadge
                  level={sighting.confidence?.confidence_level || "HIGH"}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--color-text-tertiary)] text-body-sm">
            No sightings yet. Hit Spot when you see one outside.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-h3 mb-4">Following</h2>
        {followedNganyas.length > 0 ? (
          <div className="space-y-2">
            {followedNganyas.map((nganya) => {
              const cardProps = mapSupabaseToCardProps(nganya);
              if (!cardProps) return null;
              return (
                <Card
                  key={cardProps.id}
                  nganya={cardProps as any}
                  variant="compact"
                  isFollowing
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--color-text-tertiary)] text-body-sm">
            You are not following any nganyas yet.
          </div>
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
              await updateProfile(payload);
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
              await updateProfile(payload);
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
