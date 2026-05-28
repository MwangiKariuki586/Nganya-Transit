import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import type { DashboardItem } from "./following-types";
import { mapDashboardItemToCardProps } from "./following-domain";

interface FollowingRecommendationsProps {
  recommendations: DashboardItem[];
  mutatingIds: Record<string, boolean>;
  onToggleFollow: (item: DashboardItem, isFollowing: boolean) => void;
}

export default function FollowingRecommendations({
  recommendations,
  mutatingIds,
  onToggleFollow,
}: FollowingRecommendationsProps) {
  const navigate = useNavigate();

  if (recommendations.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--color-cyan)]" />
        <div>
          <h2 className="text-h3">Recommended for you</h2>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Contextual picks with a clear reason, not generic filler.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((item) => (
          <Card
            key={item.id}
            {...mapDashboardItemToCardProps(item)}
            isFollowing={false}
            subtitle={
              item.reasonLabel || item.matchLabel || item.corridorName
            }
            isMutating={Boolean(mutatingIds[item.id])}
            onFollow={() => void onToggleFollow(item, false)}
            primaryAction={{
              label: "Follow",
              onClick: () => void onToggleFollow(item, false),
            }}
            secondaryAction={{
              label: "Find similar",
              onClick: () =>
                navigate({
                  to: "/discover",
                  search: {
                    corridor: item.corridorId || undefined,
                    vibe: item.sharedTag || item.tags[0] || undefined,
                  } as never,
                }),
              variant: "secondary",
            }}
          />
        ))}
      </div>
    </section>
  );
}
