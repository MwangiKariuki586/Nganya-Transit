import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import type { DashboardItem } from "./following-types";
import { mapDashboardItemToCardProps } from "./following-domain";

interface FilterChip {
  id: string;
  label: string;
}

interface FollowingAllSectionProps {
  filteredItems: DashboardItem[];
  filterChips: FilterChip[];
  activeFilter: string;
  mutatingIds: Record<string, boolean>;
  onFilterChange: (filterId: string) => void;
  onToggleFollow: (item: DashboardItem, isFollowing: boolean) => void;
  onPrimaryAction: (item: DashboardItem) => void;
  onSecondaryAction: (item: DashboardItem) => void;
  getPrimaryLabel: (item: DashboardItem) => string;
  getSecondaryLabel: (item: DashboardItem) => string;
}

export default function FollowingAllSection({
  filteredItems,
  filterChips,
  activeFilter,
  mutatingIds,
  onFilterChange,
  onToggleFollow,
  onPrimaryAction,
  onSecondaryAction,
  getPrimaryLabel,
  getSecondaryLabel,
}: FollowingAllSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-h3">All followed</h2>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Sorted by live now, recently seen, then offline, with your
            route matches first.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              variant="route"
              isActive={activeFilter === chip.id}
              onClick={() => onFilterChange(chip.id)}
            />
          ))}
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredItems.map((item) => (
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
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 text-sm text-[var(--color-text-secondary)]">
          Nothing matches the current filter. Try a different corridor
          or tag.
        </div>
      )}
    </section>
  );
}
