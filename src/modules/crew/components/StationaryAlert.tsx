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
    <div className="rounded-[var(--radius-xl)] border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-amber-200">
              Vehicle appears stationary
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 text-amber-200/60 hover:text-amber-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm text-amber-200/80">
            You haven't moved in a while. If you're done for the day, consider
            stopping the session to save battery.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onStopSession}
              isLoading={isStopping}
              className="bg-amber-500/20 border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
            >
              Stop session
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={isStopping}
              className="text-amber-200/60 hover:text-amber-200"
            >
              Keep going
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
