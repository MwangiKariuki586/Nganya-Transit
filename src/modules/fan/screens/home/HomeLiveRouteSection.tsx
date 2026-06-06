import Card from "@/components/ui/Card";
import { TrendingUp } from "lucide-react";
import type { FanCardData } from "@/modules/fan/lib/nganya-card";
import type { FanLiveNganyaRecord } from "@/modules/fan/lib/fan-data";
import {
  canTrackWithPlannerContext,
  type PlannerStorageContext,
} from "@/modules/fan/services/planner-storage";
import type { BrowseCardActionItem } from "./home-types";

interface HomeLiveRouteSectionProps {
  activeCorridor: string;
  activeCorridorName: string | null;
  filteredLiveNganyas: FanLiveNganyaRecord[];
  featuredLiveCardData: FanCardData;
  consolidatedLiveRouteCards: FanLiveNganyaRecord[];
  plannerContext: PlannerStorageContext;
  isFollowingNganya: (nganyaId: string) => boolean;
  onToggleFollow: (nganyaId: string) => void | Promise<void>;
  onBrowseCardAction: (item: BrowseCardActionItem) => void;
  mapSupabaseToCardProps: (dbNganya: FanLiveNganyaRecord) => FanCardData | null;
}

export function HomeLiveRouteSection({
  activeCorridor,
  activeCorridorName,
  filteredLiveNganyas,
  featuredLiveCardData,
  consolidatedLiveRouteCards,
  plannerContext,
  isFollowingNganya,
  onToggleFollow,
  onBrowseCardAction,
  mapSupabaseToCardProps,
}: HomeLiveRouteSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--color-green)]" />
          <div>
            <h2 className="text-h3">Live on this route</h2>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {filteredLiveNganyas.length} live nganya
              {filteredLiveNganyas.length === 1 ? "" : "s"} lining up on{" "}
              {activeCorridorName || "your route"}.
            </p>
          </div>
        </div>
        <a
          href={`/discover?corridorId=${encodeURIComponent(activeCorridor)}`}
          className="shrink-0 text-xs font-semibold text-[var(--color-accent)] hover:underline"
        >
          View all
        </a>
      </div>

      <div className="space-y-6">
        <div className="hidden md:block">
          <Card
            nganya={featuredLiveCardData}
            variant="feature"
            isFollowing={isFollowingNganya(featuredLiveCardData.id)}
            onFollow={onToggleFollow}
            onCardClick={() => onBrowseCardAction(featuredLiveCardData as any)}
            primaryAction={{
              label: canTrackWithPlannerContext(
                plannerContext,
                featuredLiveCardData,
              )
                ? "Track"
                : "Plan ride",
              onClick: () => onBrowseCardAction(featuredLiveCardData as any),
            }}
            secondaryAction={{
              label: isFollowingNganya(featuredLiveCardData.id)
                ? "Following"
                : "Follow",
              onClick: () => void onToggleFollow(featuredLiveCardData.id),
              variant: "secondary",
            }}
          />
        </div>
        <div className="md:hidden">
          <Card
            nganya={featuredLiveCardData}
            variant="standard"
            isFollowing={isFollowingNganya(featuredLiveCardData.id)}
            onFollow={onToggleFollow}
            onCardClick={() => onBrowseCardAction(featuredLiveCardData as any)}
            primaryAction={{
              label: canTrackWithPlannerContext(
                plannerContext,
                featuredLiveCardData,
              )
                ? "Track"
                : "Plan ride",
              onClick: () => onBrowseCardAction(featuredLiveCardData as any),
            }}
            secondaryAction={{
              label: isFollowingNganya(featuredLiveCardData.id)
                ? "Following"
                : "Follow",
              onClick: () => void onToggleFollow(featuredLiveCardData.id),
              variant: "secondary",
            }}
          />
        </div>

        {consolidatedLiveRouteCards.length > 0 ? (
          <div className="grid-cards">
            {consolidatedLiveRouteCards.map((n) => {
              const cardData = mapSupabaseToCardProps(n);
              if (!cardData) return null;
              return (
                <Card
                  key={cardData.id}
                  nganya={cardData}
                  variant="standard"
                  isFollowing={isFollowingNganya(cardData.id)}
                  onFollow={onToggleFollow}
                  onCardClick={() => onBrowseCardAction(cardData as any)}
                  primaryAction={{
                    label:
                      cardData.isLive &&
                      canTrackWithPlannerContext(plannerContext, cardData)
                        ? "Track"
                        : "Plan ride",
                    onClick: () => onBrowseCardAction(cardData as any),
                  }}
                  secondaryAction={{
                    label: isFollowingNganya(cardData.id)
                      ? "Following"
                      : "Follow",
                    onClick: () => void onToggleFollow(cardData.id),
                    variant: "secondary",
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
