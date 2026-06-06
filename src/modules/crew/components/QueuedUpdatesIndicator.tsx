import { CloudOff, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

interface QueuedUpdatesIndicatorProps {
  queuedCount: number;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function QueuedUpdatesIndicator({
  queuedCount,
  onRetry,
  isRetrying = false,
  className = "",
}: QueuedUpdatesIndicatorProps) {
  if (queuedCount === 0) return null;

  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <CloudOff className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {queuedCount} {queuedCount === 1 ? "update" : "updates"} pending
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Will sync automatically when connection improves
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          isLoading={isRetrying}
          className="shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
