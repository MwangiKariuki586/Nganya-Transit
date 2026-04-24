import { Activity, Radio } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { InlineTableLoader } from "@/components/ui/loading";
import SearchResultsOverlayV2 from "@/components/features/SearchResultsOverlayV2";
import type { FollowingScreenProps } from "./following/following-types";
import {
  getSignalText,
  getStatusTone,
  mapDashboardItemToCardProps,
} from "./following/following-domain";
import FollowingLiveSection from "./following/FollowingLiveSection";
import FollowingAllSection from "./following/FollowingAllSection";
import FollowingRecommendations from "./following/FollowingRecommendations";
import { useFollowingDashboard } from "./following/useFollowingDashboard";

export function FollowingScreenSkeleton() {
  return (
    <div className="page-container space-y-8 pt-8 pb-10 md:pt-12 md:pb-16">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-9 w-40 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
          <div className="h-4 w-72 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        </div>
        <div className="h-11 w-48 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
      </div>
      <div className="h-20 animate-skeleton rounded-[var(--radius-xl)] bg-[var(--glass-bg)]" />
      <section className="space-y-4">
        <div className="h-6 w-52 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} className="h-full" />)}
        </div>
      </section>
      <section className="space-y-4">
        <div className="h-6 w-40 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} className="h-full" />)}
        </div>
      </section>
    </div>
  );
}

export default function FollowingScreen({ data }: FollowingScreenProps) {
  const d = useFollowingDashboard(data);

  if (!data.isAuthenticated) {
    return (
      <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
        <EmptyState
          variant="no-following"
          title="Sign in to follow nganyas"
          message="Your live follows, alerts, and route-aware picks stay tied to your account."
          actionLabel="Sign In"
          onAction={() => d.navigate({ to: "/signin" })}
        />
      </div>
    );
  }

  return (
    <>
      <div className="page-container space-y-8 pt-8 pb-10 md:pt-12 md:pb-16">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-tag text-[var(--color-accent)]">Fan dashboard</p>
            <h1 className="text-h1">Following</h1>
            <p className="max-w-3xl text-body-sm text-[var(--color-text-secondary)]">
              Catch the nganyas you follow while they are live, recently
              spotted, or lining up for the route you already ride.
            </p>
          </div>
        </section>

        {d.isRefreshing ? <InlineTableLoader /> : null}

        {d.followedItems.length === 0 ? (
          <>
            <EmptyState
              variant="no-following"
              title="Follow nganyas to keep tabs on the culture"
              message="Build your live dashboard first, then jump straight into tracking, alerts, and route-aware picks."
              actionLabel="Discover nganyas"
              onAction={() => d.navigate({ to: "/discover" })}
            />
            {d.emptyRecommendations.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[var(--color-live)]" />
                  <h2 className="text-h3">Live right now</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {d.emptyRecommendations.map((item) => (
                    <Card key={item.id} {...mapDashboardItemToCardProps(item)} isFollowing={false}
                      imageBadge={{ label: getSignalText(item), className: getStatusTone(item.status) }}
                      isMutating={Boolean(d.mutatingIds[item.id])}
                      onFollow={() => void d.handleToggleFollow(item, false)}
                      primaryAction={{ label: d.getPrimaryLabel(item), onClick: () => d.handlePrimaryAction(item) }}
                      secondaryAction={{ label: d.getSecondaryLabel(item), onClick: () => d.handleSecondaryAction(item), variant: "secondary" }}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <FollowingLiveSection
              activeLiveItems={d.activeLiveItems} followedItems={d.followedItems}
              liveCount={d.liveCount} recentCount={d.recentCount} mutatingIds={d.mutatingIds}
              onToggleFollow={d.handleToggleFollow} onToggleAlerts={d.handleToggleAlerts}
              onPrimaryAction={d.handlePrimaryAction} onSecondaryAction={d.handleSecondaryAction}
              getPrimaryLabel={d.getPrimaryLabel} getSecondaryLabel={d.getSecondaryLabel}
              onPlanRide={() => d.planRideFor(d.headerTarget)}
            />
            <FollowingAllSection
              filteredItems={d.filteredFollowedItems} filterChips={d.filterChips}
              activeFilter={d.activeFilter} mutatingIds={d.mutatingIds}
              onFilterChange={d.setActiveFilter} onToggleFollow={d.handleToggleFollow}
              onPrimaryAction={d.handlePrimaryAction} onSecondaryAction={d.handleSecondaryAction}
              getPrimaryLabel={d.getPrimaryLabel} getSecondaryLabel={d.getSecondaryLabel}
            />
            <FollowingRecommendations recommendations={d.recommendations} mutatingIds={d.mutatingIds} onToggleFollow={d.handleToggleFollow} />
          </>
        )}

        <aside className="hidden lg:block">
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
              <Activity className="h-4 w-4 text-[var(--color-accent)]" />Follow summary
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between"><span>Following</span><span className="font-semibold text-[var(--color-text-primary)]">{d.followedItems.length}</span></div>
              <div className="flex items-center justify-between"><span>Live now</span><span className="font-semibold text-[var(--color-text-primary)]">{d.liveCount}</span></div>
              <div className="flex items-center justify-between"><span>Recently seen</span><span className="font-semibold text-[var(--color-text-primary)]">{d.recentCount}</span></div>
              {d.plannerRouteLabel ? (
                <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-3 py-2 text-xs">
                  Active route: <span className="font-semibold text-[var(--color-text-primary)]">{d.plannerRouteLabel}</span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {d.trackingItem && d.plannerContext.toPlace && d.plannerContext.fromStage ? (
        <SearchResultsOverlayV2 isOpen onClose={() => d.setTrackingItem(null)}
          fromStage={d.plannerContext.fromStage} toPlace={d.plannerContext.toPlace}
          preference="SPECIFIC" preferredNganya={{ id: d.trackingItem.id, name: d.trackingItem.name }}
        />
      ) : null}
    </>
  );
}
