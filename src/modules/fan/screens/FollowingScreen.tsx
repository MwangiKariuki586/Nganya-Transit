import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { toNganyaSlug } from "@/lib/formatters";
import { useFollowStore } from "@/stores/useFollowStore";
import { useNganyaStore } from "@/stores/useNganyaStore";

export default function FollowingScreen() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Store selectors
  const followedNganyas = useFollowStore((state) => state.followedNganyas);
  const followedIds = useFollowStore((state) => state.followedIds);
  const isLoadingFollows = useFollowStore((state) => state.isLoading);
  const fetchFollowedNganyas = useFollowStore(
    (state) => state.fetchFollowedNganyas,
  );
  const followNganyaAction = useFollowStore((state) => state.followNganya);
  const unfollowNganyaAction = useFollowStore((state) => state.unfollowNganya);

  const nganyas = useNganyaStore((state) => state.nganyas);
  const liveNganyas = useNganyaStore((state) => state.liveNganyas);
  const isLoadingNganyas = useNganyaStore((state) => state.isLoadingNganyas);
  const isLoadingLiveNganyas = useNganyaStore(
    (state) => state.isLoadingLiveNganyas,
  );
  const fetchNganyas = useNganyaStore((state) => state.fetchNganyas);
  const fetchLiveNganyas = useNganyaStore((state) => state.fetchLiveNganyas);

  const isLoading =
    isLoadingFollows || isLoadingNganyas || isLoadingLiveNganyas;

  // Compute recommended nganyas from store data
  const recommended = nganyas
    .filter((nganya) => !followedIds.has(nganya.id))
    .slice(0, 4);

  // Map followed nganyas with is_following flag
  const mappedFollowedNganyas = followedNganyas.map((follow: any) => ({
    ...follow.nganyas,
    is_following: true,
  }));

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const hasSession = Boolean(session?.user?.id);
      setIsAuthenticated(hasSession);

      if (hasSession) {
        // Fetch data using store actions
        fetchFollowedNganyas();
        fetchNganyas("");
        fetchLiveNganyas();
      }
    };

    checkAuthAndFetch();
  }, []);

  const mapSupabaseToCardProps = (dbNganya: any) => {
    if (!dbNganya) return null;

    const isLive = liveNganyas.some(
      (liveNganya) => liveNganya.nganya_id === dbNganya.id,
    );

    return {
      id: dbNganya.nganya_id || dbNganya.id,
      slug:
        dbNganya.slug ||
        dbNganya.nganya_slug ||
        toNganyaSlug(dbNganya.nganya_name || dbNganya.name),
      name: dbNganya.nganya_name || dbNganya.name,
      corridor:
        dbNganya.corridor_name || dbNganya.corridors?.name || "Unknown Route",
      vibeTags: dbNganya.vibeTags || dbNganya.tags || [],
      imageUrl:
        dbNganya.nganya_media?.[0]?.media_url ||
        dbNganya.image_url ||
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
      isLive,
      isNewBuild: dbNganya.tags?.includes("NEW_BUILD") || dbNganya.is_new_build,
      isVerified: dbNganya.is_verified,
      followers: dbNganya.follower_count || 0,
      sightingsToday: dbNganya.sighting_count_today || 0,
      lastSeen: isLive ? "Live now" : "Recently",
    };
  };

  const toggleFollow = async (id: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await unfollowNganyaAction(id);
      } else {
        await followNganyaAction(id);
      }
      // No need to manually refresh - optimistic updates handle this
    } catch (error) {
      console.error("Follow update failed", error);
      navigate({ to: "/signin", search: { returnTo: undefined } });
    }
  };

  if (isLoading) {
    return (
      <div className="page-container py-12 flex justify-center">
        <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
        <EmptyState
          variant="no-following"
          title="Sign in to follow nganyas"
          message="Your real follow list is tied to your account. Sign in to save builds and get back to them fast."
          actionLabel="Sign In"
          onAction={() =>
            navigate({ to: "/signin", search: { returnTo: undefined } })
          }
        />
      </div>
    );
  }

  return (
    <div className="page-container pt-8 pb-10 md:pt-12 md:pb-16 space-y-10 md:space-y-14">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-h1 mb-2">Following</h1>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Your picks - {mappedFollowedNganyas.length} nganya
            {mappedFollowedNganyas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate({ to: "/" })}>
          Plan a ride
        </Button>
      </div>

      {mappedFollowedNganyas.length > 0 ? (
        <section>
          <div className="grid-cards">
            {mappedFollowedNganyas.map((nganya) => {
              const cardProps = mapSupabaseToCardProps(nganya);
              if (!cardProps) return null;

              return (
                <Card
                  key={cardProps.id}
                  nganya={cardProps as any}
                  variant="standard"
                  isFollowing
                  onFollow={() => toggleFollow(cardProps.id, true)}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          variant="no-following"
          onAction={() => navigate({ to: "/discover" })}
        />
      )}

      {recommended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[var(--color-cyan)]" />
            <h2 className="text-h3">Recommended for you</h2>
          </div>
          <div className="grid-cards">
            {recommended.map((nganya) => {
              const cardProps = mapSupabaseToCardProps(nganya);
              if (!cardProps) return null;

              return (
                <Card
                  key={cardProps.id}
                  nganya={cardProps as any}
                  variant="standard"
                  isFollowing={false}
                  onFollow={() => toggleFollow(cardProps.id, false)}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
