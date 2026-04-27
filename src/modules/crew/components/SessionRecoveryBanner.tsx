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
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-warning)] mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Resume interrupted session?
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            You have an active session for {nganyaName} that started at{" "}
            {startTime}. Would you like to resume it?
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRecover}
              isLoading={isRecovering}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Resume session
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isRecovering}
            >
              Start new session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
