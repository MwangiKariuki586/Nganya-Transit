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
      className={`rounded-[var(--radius-lg)] border border-amber-500/30 bg-amber-500/10 p-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <CloudOff className="h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-200">
            {queuedCount} {queuedCount === 1 ? "update" : "updates"} pending
          </p>
          <p className="text-xs text-amber-200/70 mt-0.5">
            Will sync automatically when connection improves
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          isLoading={isRetrying}
          className="shrink-0 text-amber-200 hover:text-amber-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
