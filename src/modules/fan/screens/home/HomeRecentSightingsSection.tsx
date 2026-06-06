import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { Clock, ChevronRight } from "lucide-react";
import {
  canTrackWithPlannerContext,
  type PlannerStorageContext,
} from "@/modules/fan/services/planner-storage";
import { getRecencyLabel } from "./home-recent-sightings";
import type {
  AggregatedRecentSightingRow,
  RecentSightingFilter,
} from "./home-types";

interface HomeRecentSightingsSectionProps {
  activeCorridor: string | null;
  plannerContext: PlannerStorageContext;
  recentFilter: RecentSightingFilter;
  recentSummaryCount: number;
  onRouteRecentCount: number;
  highActivityRecentCount: number;
  filteredAggregatedRecentSightings: AggregatedRecentSightingRow[];
  showAllRecent: boolean;
  onSetRecentFilter: (filter: RecentSightingFilter) => void;
  onRecentRowAction: (row: AggregatedRecentSightingRow) => void;
  onToggleShowAllRecent: () => void;
  onNavigateToSpot: () => void;
}

export function HomeRecentSightingsSection({
  activeCorridor,
  plannerContext,
  recentFilter,
  recentSummaryCount,
  onRouteRecentCount,
  highActivityRecentCount,
  filteredAggregatedRecentSightings,
  showAllRecent,
  onSetRecentFilter,
  onRecentRowAction,
  onToggleShowAllRecent,
  onNavigateToSpot,
}: HomeRecentSightingsSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-h3">Recently Spotted</h2>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {recentSummaryCount > 0
              ? `${recentSummaryCount} nganyas spotted in the last 15 min`
              : "Fresh route signals, grouped for quick decisions"}
          </p>
        </div>
        {filteredAggregatedRecentSightings.length > 0 ? (
          <button
            onClick={onToggleShowAllRecent}
            className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] transition-colors cursor-pointer hover:text-[var(--color-accent)]"
          >
            {showAllRecent ? "Show less" : "See all"}{" "}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip
          label={`All (${recentSummaryCount})`}
          variant="route"
          isActive={recentFilter === "ALL"}
          onClick={() => onSetRecentFilter("ALL")}
        />
        {activeCorridor ? (
          <Chip
            label={`On your route (${onRouteRecentCount})`}
            variant="route"
            isActive={recentFilter === "ON_ROUTE"}
            onClick={() => onSetRecentFilter("ON_ROUTE")}
          />
        ) : null}
        <Chip
          label={`High activity (${highActivityRecentCount})`}
          variant="route"
          isActive={recentFilter === "HIGH_ACTIVITY"}
          onClick={() => onSetRecentFilter("HIGH_ACTIVITY")}
        />
      </div>

      {filteredAggregatedRecentSightings.length > 0 ? (
        <div className="space-y-2">
          {filteredAggregatedRecentSightings
            .slice(
              0,
              showAllRecent ? filteredAggregatedRecentSightings.length : 5,
            )
            .map((row) => {
              const recencyLabel = getRecencyLabel(
                row.lastSeenMinutes,
                row.lastSeenAt,
              );
              const isFresh = row.lastSeenMinutes <= 15;
              const canTrackRow = canTrackWithPlannerContext(
                plannerContext,
                row,
              );
              const actionLabel =
                isFresh && canTrackRow ? "Track" : "Plan ride";
              const primaryContext = row.directionLabel
                ? `${row.stageName || row.corridorName} ${row.directionLabel}`
                : row.stageName || row.corridorName;
              const secondaryContext = row.onRoute
                ? `${row.corridorName}`
                : row.corridorName;
              const toneClasses =
                row.statusTone === "hot"
                  ? "bg-[var(--color-accent)]"
                  : row.statusTone === "warm"
                    ? "bg-[var(--color-warning)]"
                    : "bg-[var(--color-text-tertiary)]";

              return (
                <div
                  key={row.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => onRecentRowAction(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRecentRowAction(row);
                    }
                  }}
                  className="grid w-full grid-cols-[12px_minmax(0,1.2fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-left transition-colors hover:border-[var(--glass-border-hover)]"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${toneClasses}`} />

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {row.nganyaName}
                    </div>
                    <div className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                      {primaryContext}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs text-[var(--color-text-secondary)]">
                      {secondaryContext}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                      <span>{row.signalLabel}</span>
                      {row.sightingsCountRecent > 1 ? (
                        <span>{row.sightingsCountRecent} sightings</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-self-end">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-xs text-[var(--color-text-tertiary)]">
                        <Clock className="h-3 w-3" />
                        {recencyLabel}
                      </div>
                    </div>
                    <Button
                      variant={isFresh && canTrackRow ? "primary" : "secondary"}
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRecentRowAction(row);
                      }}
                    >
                      {actionLabel}
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] bg-[var(--color-bg-card)]/35 p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-primary)]">
                {recentFilter === "ON_ROUTE"
                  ? "No fresh sightings on your route"
                  : recentFilter === "HIGH_ACTIVITY"
                    ? "No high-activity sightings right now"
                    : "No recent sightings yet"}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={onNavigateToSpot}>
              Be the first to spot
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
