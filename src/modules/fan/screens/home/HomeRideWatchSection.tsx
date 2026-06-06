import type { RefObject } from "react";
import Button from "@/components/ui/Button";
import CatchabilityBadge from "@/components/ui/CatchabilityBadge";
import TrackingSignalBadge from "@/components/ui/TrackingSignalBadge";
import { BellRing, ShieldAlert } from "lucide-react";
import type {
  PlannerRideOption,
} from "@/modules/fan/services/planner-assist";
import type { PlannerRiskPrompt } from "./home-types";

interface HomeRideWatchSectionProps {
  rideWatchSectionRef: RefObject<HTMLElement>;
  rideWatchScrollMargin: string;
  plannerJourneyKey: string | null;
  plannerAssistStatus: "idle" | "no_matches" | "watchable" | "risky" | "stale";
  plannerRideOptions: PlannerRideOption[];
  watchedRide: PlannerRideOption | null;
  recommendedRide: PlannerRideOption | null;
  backupRides: PlannerRideOption[];
  plannerRiskPrompt: PlannerRiskPrompt | null;
  fromStageName: string | null | undefined;
  isFollowingNganya: (nganyaId: string) => boolean;
  plannerAlertIds: Set<string>;
  onSwitchRide: (ride: PlannerRideOption) => void;
  onKeepWatching: () => void;
  onPlannerAlertAction: (ride: PlannerRideOption) => void;
  onWatchRide: (ride: PlannerRideOption) => void;
}

function SeatsBadge({ seatsLeft }: { seatsLeft: number | null | undefined }) {
  if (!Number.isFinite(seatsLeft)) return null;

  const count = Number(seatsLeft);
  const isFull = count <= 0;
  const isLow = count > 0 && count <= 3;

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        isFull
          ? "border border-red-500/40 bg-red-500/18 text-red-200"
          : isLow
            ? "border border-amber-400/40 bg-amber-400/18 text-amber-100"
            : "border border-emerald-400/35 bg-emerald-400/15 text-emerald-100",
      ].join(" ")}
    >
      {isFull ? "Full" : `${count} seats left`}
    </span>
  );
}

function SeatsAvailabilityPanel({
  seatsLeft,
}: {
  seatsLeft: number | null | undefined;
}) {
  const hasSeats = Number.isFinite(seatsLeft);
  const count = hasSeats ? Number(seatsLeft) : null;

  return (
    <div className="w-full text-left md:text-right">
      <p className="text-4xl font-black leading-none text-[var(--color-text-primary)] md:text-5xl">
        {hasSeats ? count : "--"}
      </p>
      <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
        {count === 1 ? "seat" : "seats"}
      </p>
    </div>
  );
}

export function HomeRideWatchSection({
  rideWatchSectionRef,
  rideWatchScrollMargin,
  plannerJourneyKey,
  plannerAssistStatus,
  plannerRideOptions,
  watchedRide,
  recommendedRide,
  backupRides,
  plannerRiskPrompt,
  fromStageName,
  isFollowingNganya,
  plannerAlertIds,
  onSwitchRide,
  onKeepWatching,
  onPlannerAlertAction,
  onWatchRide,
}: HomeRideWatchSectionProps) {
  if (!plannerJourneyKey || plannerAssistStatus === "no_matches") return null;

  return (
    <section
      ref={rideWatchSectionRef}
      className="space-y-4"
      style={{ scrollMarginTop: rideWatchScrollMargin }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-h3">Ride watch</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {watchedRide
              ? `Watching ${watchedRide.nganya_name} for ${fromStageName}.`
              : "Pick one ride to watch or keep backups ready."}
          </p>
        </div>
        {plannerRideOptions.length > 0 ? (
          <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-xs text-[var(--color-text-tertiary)]">
            {plannerRideOptions.length} match
            {plannerRideOptions.length === 1 ? "" : "es"}
          </span>
        ) : null}
      </div>

      {plannerRiskPrompt ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]/15 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--color-warning)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {plannerRiskPrompt.reason === "missing"
                  ? "Your watched ride dropped out of the live results."
                  : plannerRiskPrompt.reason === "stale"
                    ? "Your watched ride is stale now."
                    : "Your watched ride is getting risky."}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {plannerRiskPrompt.alternative
                  ? `Switch to ${plannerRiskPrompt.alternative.nganya_name} or keep waiting for your current ride.`
                  : "Keep waiting if you want, but you should not rely on this ride alone."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {plannerRiskPrompt.alternative ? (
                  <Button
                    size="sm"
                    onClick={() => onSwitchRide(plannerRiskPrompt.alternative!)}
                  >
                    Switch to {plannerRiskPrompt.alternative.nganya_name}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={onKeepWatching}>
                  Keep watching
                </Button>
                {recommendedRide &&
                !(isFollowingNganya(recommendedRide.nganya_id) ||
                  plannerAlertIds.has(recommendedRide.nganya_id)) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPlannerAlertAction(recommendedRide)}
                  >
                    Turn on alerts
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {recommendedRide ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 md:p-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)] md:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  {watchedRide ? "Watched ride" : "Best ride now"}
                </span>
                <TrackingSignalBadge
                  signalType={recommendedRide.signalType}
                  freshnessSeconds={recommendedRide.freshnessSeconds ?? undefined}
                />
              </div>
              <div>
                <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {recommendedRide.nganya_name}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {recommendedRide.corridor_name} to {fromStageName}, about{" "}
                  {recommendedRide.eta_minutes} min away
                </p>
              </div>
              <CatchabilityBadge
                status={recommendedRide.catchability.status}
                label={recommendedRide.catchability.label}
                subtext={recommendedRide.catchability.subtext}
              />
            </div>

            <div className="flex flex-col md:items-end">
              <SeatsAvailabilityPanel seatsLeft={recommendedRide.seats_left} />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              className="w-full sm:w-auto sm:min-w-[190px]"
              onClick={() => onWatchRide(recommendedRide)}
            >
              {watchedRide?.nganya_id === recommendedRide.nganya_id
                ? "Refresh on map"
                : "Watch on map"}
            </Button>
            <Button
              className="w-full sm:w-auto sm:min-w-[190px]"
              variant="ghost"
              onClick={() => onPlannerAlertAction(recommendedRide)}
            >
              <BellRing className="h-4 w-4" />
              {isFollowingNganya(recommendedRide.nganya_id) ||
              plannerAlertIds.has(recommendedRide.nganya_id)
                ? "Alerts on"
                : "Follow route alerts"}
            </Button>
          </div>
        </div>
      ) : null}

      {backupRides.length > 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                Backup rides
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                Keep one ready in case your watched ride slows down or drops out.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {backupRides.slice(0, 3).map((ride) => (
              <div
                key={ride.nganya_id}
                className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-bg-card)]/50 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {ride.nganya_name}
                    </p>
                    <SeatsBadge seatsLeft={ride.seats_left} />
                    <TrackingSignalBadge
                      signalType={ride.signalType}
                      freshnessSeconds={ride.freshnessSeconds ?? undefined}
                    />
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    ~{ride.eta_minutes} min on {ride.corridor_name}
                  </p>
                  <CatchabilityBadge
                    status={ride.catchability.status}
                    label={ride.catchability.label}
                    subtext={ride.catchability.subtext}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSwitchRide(ride)}
                  >
                    Watch on map
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
