import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Card from "@/components/ui/Card";
import LiveBadge from "@/components/ui/LiveBadge";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import { ResponsiveNganyaImage } from "@/components/ui/ResponsiveNganyaImage";
import PremiumGallery from "@/components/features/PremiumGallery";
import { vibeTagColors } from "@/lib/mockData";
import { getNganyaBySlug, getNganyasByCorridor } from "@/lib/queries/discover";
import { getLiveNow } from "@/lib/queries/live";
import { getCorridorSightings } from "@/lib/queries/sightings";
import {
  followNganya,
  getMyFollows,
  unfollowNganya,
} from "@/lib/queries/follows";
import { formatRelativeTime, toNganyaSlug } from "@/lib/formatters";
import {
  Heart,
  Bell,
  Share2,
  Eye,
  Clock,
  MapPin,
  Camera,
  ChevronLeft,
  Users,
} from "lucide-react";

export default function NganyaDetailScreen() {
  const navigate = useNavigate();
  const { slug } = useParams({ from: "/(fan)/nganya/$slug" });
  const [nganya, setNganya] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [nganyaSightings, setNganyaSightings] = useState<any[]>([]);
  const [relatedNganyas, setRelatedNganyas] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNganya() {
      setIsLoading(true);
      try {
        const data = await getNganyaBySlug(slug);
        if (!data) {
          setNganya(null);
          return;
        }

        setNganya(data);

        const [liveRes, corridorSightings, related, myFollows] =
          await Promise.all([
            getLiveNow(data.corridor_id),
            getCorridorSightings(data.corridor_id),
            getNganyasByCorridor(data.corridor_id, data.id),
            getMyFollows().catch(() => []),
          ]);

        setIsLive(
          (liveRes || []).some(
            (liveNganya) => liveNganya.nganya_id === data.id,
          ) || data.status === "LIVE",
        );
        setNganyaSightings(
          (corridorSightings || []).filter(
            (sighting) => sighting.nganya_id === data.id,
          ),
        );
        setRelatedNganyas(related || []);
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
      <div className="page-container py-16 flex justify-center">
        <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]" />
      </div>
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
  const imageUrl =
    nganya.nganya_media?.[0]?.media_url ||
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80";
  const tags = nganya.tags || [];
  const isNewBuild = tags.includes("NEW_BUILD");

  return (
    <div className="animate-slide-up">
      <div className="relative h-[280px] md:h-[400px] overflow-hidden">
        <ResponsiveNganyaImage
          src={imageUrl}
          alt={nganya.name}
          variant="detail"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-[var(--color-bg-base)]/40 to-transparent" />

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

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8 md:px-8 md:pb-8 md:pt-12 lg:px-12">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {isLive && <LiveBadge />}
              {isNewBuild && (
                <span className="animate-shimmer px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-green-soft)] text-[var(--color-green)] text-[10px] font-bold tracking-wider uppercase border border-[rgba(57,255,20,0.2)]">
                  New Build
                </span>
              )}
              {nganya.is_verified && <ConfidenceBadge level="HIGH" />}
            </div>
            <h1 className="text-display text-white">{nganya.name}</h1>
          </div>
        </div>
      </div>

      <div className="page-container pt-8 pb-10 md:pt-10 md:pb-16 space-y-8 md:space-y-10">
        <div className="flex flex-wrap gap-3">
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
          <Button
            variant="secondary"
            onClick={() => setIsNotifying(!isNotifying)}
          >
            <Bell
              className="w-4 h-4"
              fill={isNotifying ? "currentColor" : "none"}
            />
            {isNotifying ? "Notifying" : "Notify"}
          </Button>
          <Link to="/spot" className="no-underline">
            <Button variant="secondary">
              <Camera className="w-4 h-4" />
              Spot
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-4 md:gap-8 p-4 rounded-[var(--radius-lg)] bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-accent)]" />
            <div>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {isFollowing ? "Following" : "Open"}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)] ml-1">
                follow status
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[var(--color-cyan)]" />
            <div>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {nganyaSightings.length}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)] ml-1">
                recent sightings
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <div>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {nganyaSightings[0]?.created_at
                  ? formatRelativeTime(nganyaSightings[0].created_at)
                  : "Recently"}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)] ml-1">
                last seen
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--color-warning)]" />
            <div>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {corridorName}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-h3 !mb-3">About</h2>
          <p className="text-body text-[var(--color-text-secondary)] leading-relaxed">
            Operates on the {corridorName} corridor with{" "}
            {nganya.is_verified ? "verified" : "community"} status and a culture
            profile shaped by recent sightings.
          </p>
        </div>

        {tags.length > 0 && (
          <div>
            <h2 className="text-h3 !mb-3">Vibes</h2>
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
          </div>
        )}

        <div>
          <h2 className="text-h3 !mb-3">Gallery</h2>
          <PremiumGallery
            nganyaId={nganya.id}
            initialImages={nganya.nganya_media || []}
          />
        </div>

        <div>
          <h2 className="text-h3 !mb-3">Recent Sightings</h2>
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
                        level={sighting.confidence?.confidence_level || "HIGH"}
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
        </div>

        {relatedNganyas.length > 0 && (
          <div>
            <h2 className="text-h3 !mb-3">More from {corridorName}</h2>
            <div className="grid-cards">
              {relatedNganyas.map((relatedNganya) => (
                <Card
                  key={relatedNganya.id}
                  nganya={{
                    id: relatedNganya.id,
                    slug: toNganyaSlug(relatedNganya.name),
                    name: relatedNganya.name,
                    corridor: relatedNganya.corridors?.name || corridorName,
                    vibeTags: relatedNganya.tags || [],
                    followers: 0,
                    sightingsToday: 0,
                    lastSeen: "Recently",
                    lastSeenMinutes: 0,
                    confidence: "high",
                    isLive: false,
                    isNewBuild: (relatedNganya.tags || []).includes(
                      "NEW_BUILD",
                    ),
                    imageUrl:
                      relatedNganya.nganya_media?.[0]?.media_url ||
                      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
                    description: "",
                  }}
                  variant="standard"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
