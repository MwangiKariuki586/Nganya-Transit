import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { ConnectionBanner } from "@/modules/crew/components/ConnectionBanner";
import { CrewHeaderStatus } from "@/modules/crew/components/CrewHeaderStatus";
import { DirectionToggle } from "@/modules/crew/components/DirectionToggle";
import { PermissionBanner } from "@/modules/crew/components/PermissionBanner";
import { SeatsQuickButtons } from "@/modules/crew/components/SeatsQuickButtons";
import { FlexibleSeatSelector } from "@/modules/crew/components/FlexibleSeatSelector";
import { useCrewLiveSessionV2 } from "@/modules/crew/hooks/useCrewLiveSessionV2";
import { clearCrewActiveSessionId } from "@/modules/crew/lib/session-storage";
import { GpsQualityIndicator } from "@/modules/crew/components/GpsQualityIndicator";
import { NetworkQualityIndicator } from "@/modules/crew/components/NetworkQualityIndicator";
import { SessionTimer } from "@/modules/crew/components/SessionTimer";
import { QuickSeatPresets } from "@/modules/crew/components/QuickSeatPresets";
import { StationaryAlert } from "@/modules/crew/components/StationaryAlert";
import { DirectionChangePrompt } from "@/modules/crew/components/DirectionChangePrompt";
import { QueuedUpdatesIndicator } from "@/modules/crew/components/QueuedUpdatesIndicator";
import { SessionInsights } from "@/modules/crew/components/SessionInsights";
import { KeyboardShortcutsHelp } from "@/modules/crew/components/KeyboardShortcutsHelp";
import {
  useKeyboardShortcuts,
  getCrewLiveShortcuts,
} from "@/modules/crew/hooks/useKeyboardShortcuts";
import {
  hapticSeatUpdate,
  hapticDirectionChange,
  hapticSessionStop,
} from "@/modules/crew/lib/haptics";

interface CrewLiveSessionScreenV2Props {
  sessionId: string;
}

export default function CrewLiveSessionScreenV2({
  sessionId,
}: CrewLiveSessionScreenV2Props) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [initialSession, setInitialSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [showStationaryAlert, setShowStationaryAlert] = useState(false);
  const [showDirectionPrompt, setShowDirectionPrompt] = useState(false);

  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const session = await crewLiveService.getSession(sessionId);

        // Redirect if session is not active
        if (session.status !== "LIVE" || session.ended_at) {
          addToast("This session has ended", "error");
          navigate({ to: "/crew/live" });
          return;
        }

        setInitialSession(session);
      } catch (error: any) {
        setLoadError(error?.message || "Failed to load live session.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSession();
  }, [sessionId, navigate, addToast]);

  const {
    session,
    coords,
    permissionStatus,
    networkStatus,
    connectionStatus,
    isPinging,
    lastPingAgeMs,
    queuedUpdates,
    requestPermission,
    updateSeats,
    updateDirection,
    stopSession,
    retryNow,
  } = useCrewLiveSessionV2({
    initialSession,
    onStationaryDetected: () => {
      setShowStationaryAlert(true);
    },
    onDirectionChangeDetected: () => {
      setShowDirectionPrompt(true);
    },
  });

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await stopSession();
      clearCrewActiveSessionId();
      hapticSessionStop();
      addToast("Live session stopped.", "success");
      navigate({ to: "/crew/live" });
    } catch (error: any) {
      addToast(error?.message || "Failed to stop live session.", "error");
    } finally {
      setIsStopping(false);
    }
  };

  const handleSeatUpdate = async (seats: number) => {
    await updateSeats(seats);
    hapticSeatUpdate(seats);
  };

  const handleDirectionUpdate = async (direction: string) => {
    await updateDirection(direction);
    hapticDirectionChange();
  };

  const handleDirectionPromptConfirm = async (
    newDirection: "TO_TOWN" | "FROM_TOWN",
  ) => {
    await handleDirectionUpdate(newDirection);
    setShowDirectionPrompt(false);
    addToast("Direction updated", "success");
  };

  const clampSeats = (value: number) => Math.max(0, Math.min(33, value));

  // Keyboard shortcuts
  const shortcuts = getCrewLiveShortcuts({
    incrementSeats: () => {
      if (session && !isPinging) {
        void handleSeatUpdate(clampSeats(session.seats_left + 1));
      }
    },
    decrementSeats: () => {
      if (session && !isPinging) {
        void handleSeatUpdate(clampSeats(session.seats_left - 1));
      }
    },
    setFull: () => {
      if (session && !isPinging) {
        void handleSeatUpdate(0);
      }
    },
    toggleDirection: () => {
      if (session && !isPinging) {
        const newDirection =
          session.direction === "TO_TOWN" ? "FROM_TOWN" : "TO_TOWN";
        void handleDirectionUpdate(newDirection);
      }
    },
    stopSession: () => {
      if (!isStopping) {
        void handleStop();
      }
    },
  });

  useKeyboardShortcuts({ shortcuts, enabled: !isLoading && !loadError });

  if (isLoading) {
    return (
      <div className="page-container py-12 text-sm text-[var(--color-text-secondary)]">
        Loading live session...
      </div>
    );
  }

  if (loadError || !session) {
    return (
      <div className="page-container py-12">
        <div className="rounded-[var(--radius-xl)] border border-red-500/30 bg-red-500/10 p-5 text-red-200">
          {loadError || "This live session is not available."}
        </div>
        <Link
          to="/crew/live"
          className="mt-4 inline-block text-sm text-[var(--color-accent)] no-underline"
        >
          Back to crew live setup
        </Link>
      </div>
    );
  }

  const connectionMessage =
    connectionStatus === "offline"
      ? "Network connection dropped. Updates will retry when you are back online."
      : connectionStatus === "poor"
        ? "Live updates are lagging. Signal looks weak."
        : connectionStatus === "retrying"
          ? "Retrying failed updates..."
          : null;

  return (
    <div className="page-container py-8 md:py-10 max-w-2xl space-y-5">
      {/* Header with status and quality indicators */}
      <div className="space-y-3">
        <CrewHeaderStatus
          isLive={session.status === "LIVE"}
          nganyaName={session.nganyas?.name || "Mapped nganya"}
          corridorName={session.nganyas?.corridors?.name || "Unknown corridor"}
          direction={session.direction}
          seatsLeft={session.seats_left}
          lastPingAt={session.last_ping_at}
          lastPingAgeMs={lastPingAgeMs}
        />

        <div className="flex flex-wrap items-center gap-3">
          <SessionTimer startedAt={session.started_at} />
          <GpsQualityIndicator accuracy={coords?.accuracy ?? null} />
          <NetworkQualityIndicator showDetails />
          <div className="ml-auto">
            <KeyboardShortcutsHelp shortcuts={shortcuts} />
          </div>
        </div>
      </div>

      {/* Alerts and banners */}
      <PermissionBanner
        status={permissionStatus}
        onRequest={() => {
          void requestPermission().catch(() => null);
        }}
      />
      <ConnectionBanner
        status={connectionStatus}
        message={connectionMessage}
        onRetry={() => {
          void retryNow();
        }}
      />
      <QueuedUpdatesIndicator
        queuedCount={queuedUpdates.length}
        onRetry={() => {
          void retryNow();
        }}
        isRetrying={isPinging}
      />

      {showStationaryAlert && (
        <StationaryAlert
          onStopSession={handleStop}
          onDismiss={() => setShowStationaryAlert(false)}
          isStopping={isStopping}
        />
      )}

      {showDirectionPrompt && (
        <DirectionChangePrompt
          currentDirection={session.direction}
          toTownLabel="→ Town"
          fromTownLabel={`→ ${session.nganyas?.corridors?.name || "Terminal"}`}
          onConfirm={handleDirectionPromptConfirm}
          onDismiss={() => setShowDirectionPrompt(false)}
          isUpdating={isPinging}
        />
      )}

      {/* Quick seat presets */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
        <div className="mb-4">
          <div className="text-caption text-[var(--color-text-tertiary)]">
            Quick updates
          </div>
          <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
            One-tap seat status updates
          </div>
        </div>
        <QuickSeatPresets
          onSelect={(seats, label) => {
            void handleSeatUpdate(seats);
            addToast(`Set to ${label}`, "success");
          }}
          disabled={isPinging}
          maxSeats={33}
        />
      </section>

      {/* Seats update */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-caption text-[var(--color-text-tertiary)]">
              Fine-tune seats
            </div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Use +/- buttons or arrow keys. Updates sync instantly.
            </div>
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">
            {isPinging ? "Syncing..." : "Synced"}
          </div>
        </div>
        <div className="mt-4">
          <FlexibleSeatSelector
            value={session.seats_left}
            onChange={(value) => {
              void handleSeatUpdate(value);
            }}
            disabled={isPinging}
            maxSeats={33}
          />
        </div>
        {session.seats_left === 0 ? (
          <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
            Full selected. If boarding is closed for a while, consider stopping
            the session.
          </div>
        ) : null}
      </section>

      {/* Direction */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
        <div className="text-caption text-[var(--color-text-tertiary)]">
          Direction
        </div>
        <div className="mt-3">
          <DirectionToggle
            value={session.direction}
            onChange={(value) => {
              void handleDirectionUpdate(value);
            }}
            disabled={isPinging}
            toTownLabel="→ Town"
            fromTownLabel={`→ ${session.nganyas?.corridors?.name || "Terminal"}`}
          />
        </div>
        <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
          Press 'D' key to toggle. Auto-detection will prompt if U-turn
          detected.
        </div>
      </section>

      {/* Session insights */}
      <SessionInsights session={session} />

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="secondary"
          className="min-h-[56px]"
          onClick={() => navigate({ to: "/crew/history" })}
        >
          Session history
        </Button>
        <Button
          variant="primary"
          className="min-h-[56px] bg-[var(--color-accent)] hover:bg-[var(--color-accent)/90] shadow-none"
          isLoading={isStopping}
          onClick={handleStop}
        >
          Stop session (Ctrl+S)
        </Button>
      </div>
    </div>
  );
}
