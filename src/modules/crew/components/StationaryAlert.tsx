import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";

interface StationaryAlertProps {
  onStopSession: () => void;
  onDismiss: () => void;
  isStopping?: boolean;
}

export function StationaryAlert({
  onStopSession,
  onDismiss,
  isStopping = false,
}: StationaryAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--color-warning)] mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Vehicle appears stationary
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            You haven't moved in a while. If you're done for the day, consider
            stopping the session to save battery.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onStopSession}
              isLoading={isStopping}
            >
              Stop session
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={isStopping}
            >
              Keep going
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
