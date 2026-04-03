import { MapPin, Navigation, CheckCircle } from "lucide-react";
import type { Stage } from "../hooks/useStageDetection";

interface RouteProgressProps {
  stages: Stage[];
  currentStage: Stage | null;
  nearestStage: Stage | null;
  distanceToNearest: number | null;
  recentStages: Array<{ stage: Stage; timestamp: number }>;
  upcomingStages: Stage[];
  className?: string;
}

export function RouteProgress({
  stages,
  currentStage,
  nearestStage,
  distanceToNearest,
  recentStages,
  upcomingStages,
  className = "",
}: RouteProgressProps) {
  const currentIndex = currentStage
    ? stages.findIndex((s) => s.id === currentStage.id)
    : -1;
  const progress =
    currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;

  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Route Progress
        </h3>
        <div className="text-xs text-[var(--color-text-tertiary)]">
          {currentIndex >= 0 ? `${currentIndex + 1}/${stages.length}` : "—"}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="h-2 bg-[var(--color-line)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-[var(--color-text-tertiary)] text-center">
          {progress.toFixed(0)}% complete
        </div>
      </div>

      {/* Current/Nearest stage */}
      {(currentStage || nearestStage) && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-[var(--color-accent)]" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {currentStage ? "At" : "Near"}{" "}
                {(currentStage || nearestStage)?.name}
              </div>
              {distanceToNearest !== null && distanceToNearest > 0 && (
                <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  {distanceToNearest < 1000
                    ? `${distanceToNearest.toFixed(0)}m away`
                    : `${(distanceToNearest / 1000).toFixed(1)}km away`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent stages */}
      {recentStages.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wider">
            Recent
          </div>
          <div className="space-y-2">
            {recentStages.map((item, index) => {
              const timeAgo = Math.floor((Date.now() - item.timestamp) / 60000);
              return (
                <div
                  key={item.stage.id}
                  className="flex items-center gap-2 p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-body)] border border-[var(--color-line)]"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-text-primary)] truncate">
                      {item.stage.name}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      {timeAgo === 0 ? "Just now" : `${timeAgo}m ago`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming stages */}
      {upcomingStages.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wider">
            Upcoming
          </div>
          <div className="space-y-2">
            {upcomingStages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex items-center gap-2 p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-body)] border border-[var(--color-line)] opacity-70"
              >
                <MapPin className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--color-text-secondary)] truncate">
                    {stage.name}
                  </div>
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  +{index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stages.length === 0 && (
        <div className="text-center py-6 text-sm text-[var(--color-text-tertiary)]">
          No stage data available for this route
        </div>
      )}
    </div>
  );
}
