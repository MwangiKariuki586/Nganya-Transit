import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

interface SessionRecoveryBannerProps {
  sessionId: string;
  nganyaName: string;
  startedAt: string;
  onRecover: () => void;
  onDismiss: () => void;
  isRecovering?: boolean;
}

export function SessionRecoveryBanner({
  sessionId,
  nganyaName,
  startedAt,
  onRecover,
  onDismiss,
  isRecovering = false,
}: SessionRecoveryBannerProps) {
  const startTime = new Date(startedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-[var(--radius-xl)] border border-amber-500/30 bg-amber-500/10 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-200">
            Resume interrupted session?
          </h3>
          <p className="mt-1 text-sm text-amber-200/80">
            You have an active session for {nganyaName} that started at{" "}
            {startTime}. Would you like to resume it?
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRecover}
              isLoading={isRecovering}
              className="bg-amber-500/20 border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Resume session
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isRecovering}
              className="text-amber-200/60 hover:text-amber-200"
            >
              Start new session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
