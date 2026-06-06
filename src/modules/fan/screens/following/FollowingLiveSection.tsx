import { Radio } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { DashboardItem } from "./following-types";
import {
  getSignalText,
  getStatusTone,
  mapDashboardItemToCardProps,
} from "./following-domain";

interface FollowingLiveSectionProps {
  activeLiveItems: DashboardItem[];
  followedItems: DashboardItem[];
  liveCount: number;
  recentCount: number;
  mutatingIds: Record<string, boolean>;
  onToggleFollow: (item: DashboardItem, isFollowing: boolean) => void;
  onToggleAlerts: (item: DashboardItem, nextNotifyLive: boolean) => void;
  onPrimaryAction: (item: DashboardItem) => void;
  onSecondaryAction: (item: DashboardItem) => void;
  getPrimaryLabel: (item: DashboardItem) => string;
  getSecondaryLabel: (item: DashboardItem) => string;
  onPlanRide: () => void;
}

export default function FollowingLiveSection({
  activeLiveItems,
  followedItems,
  liveCount,
  recentCount,
  mutatingIds,
  onToggleFollow,
  onToggleAlerts,
  onPrimaryAction,
  onSecondaryAction,
  getPrimaryLabel,
  getSecondaryLabel,
  onPlanRide,
}: FollowingLiveSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[var(--color-live)]" />
            <h2 className="text-h3">Live from your follows</h2>
          </div>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Followed nganyas that matter right now: live, recently seen,
            or matching your route.
          </p>
        </div>
        <div className="hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)] lg:block">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {liveCount}
          </span>{" "}
          live
          {" · "}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {recentCount}
          </span>{" "}
          recently seen
        </div>
      </div>

      {activeLiveItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeLiveItems.map((item) => (
            <Card
              key={item.id}
              {...mapDashboardItemToCardProps(item)}
              isFollowing
              isMutating={Boolean(mutatingIds[item.id])}
              onFollow={() => void onToggleFollow(item, true)}
              primaryAction={{
                label: getPrimaryLabel(item),
                onClick: () => onPrimaryAction(item),
              }}
              secondaryAction={{
                label: getSecondaryLabel(item),
                onClick: () => onSecondaryAction(item),
                variant: "secondary",
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-6">
          <h3 className="text-h4">
            None of your follows are live right now
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Keep alerts on, plan a ride from the same corridor, or use
            recommendations below to catch the next one moving.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={onPlanRide}
            >
              Plan a ride
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const firstOffline = followedItems.find(
                  (item) =>
                    item.status === "OFFLINE" && !item.notifyLive,
                );
                if (firstOffline) {
                  onToggleAlerts(firstOffline, true);
                }
              }}
            >
              Turn on alerts
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
