import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastContainer";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { CrewHeaderStatus } from "@/modules/crew/components/CrewHeaderStatus";
import { DirectionToggle } from "@/modules/crew/components/DirectionToggle";
import { PermissionBanner } from "@/modules/crew/components/PermissionBanner";
import { FlexibleSeatSelector } from "@/modules/crew/components/FlexibleSeatSelector";
import { TrackingHealthPanel } from "@/modules/crew/components/TrackingHealthPanel";
import { useCrewLocationRuntime } from "@/modules/crew/hooks/useCrewLocationRuntime";
import { useCrewLiveSessionV2 } from "@/modules/crew/hooks/useCrewLiveSessionV2";
import { clearCrewActiveSessionId } from "@/modules/crew/lib/session-storage";
import { SessionTimer } from "@/modules/crew/components/SessionTimer";
import { DirectionChangePrompt } from "@/modules/crew/components/DirectionChangePrompt";
import { SessionInsights } from "@/modules/crew/components/SessionInsights";
import { KeyboardShortcutsHelp } from "@/modules/crew/components/KeyboardShortcutsHelp";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
  const [showDirectionPrompt, setShowDirectionPrompt] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Track when the last edit (seat or direction) was sent so the selector
  // can show "Last update: just now" etc.
  const lastEditAtRef = useRef<string | null>(null);

  // Location runtime — single watcher owner for this session screen.
  const locationRuntime = useCrewLocationRuntime();

  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const session = await crewLiveService.getSession(sessionId);

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
    permissionStatus,
    connectionStatus,
    isPinging,
    lastPingAgeMs,
    queuedUpdates,
    requestPermission,
    updateSeats,
    updateDirection,
    stopSession,
    retryNow,
    uploadStatus,
    clientState,
    hasPendingUpload,
  } = useCrewLiveSessionV2({
    initialSession,
    locationRuntime,
    onDirectionChangeDetected: () => {
      setShowDirectionPrompt(true);
    },
  });

  /** Open the confirmation dialog — never stops the session directly. */
  const requestStop = () => setShowStopConfirm(true);

  /** Called only after the crew confirms in the dialog. */
  const confirmStop = async () => {
    setShowStopConfirm(false);
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
    lastEditAtRef.current = new Date().toISOString();
  };

  const handleDirectionUpdate = async (direction: string) => {
    await updateDirection(direction);
    hapticDirectionChange();
    lastEditAtRef.current = new Date().toISOString();
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
        requestStop();
      }
    },
  });

  useKeyboardShortcuts({ shortcuts, enabled: !isLoading && !loadError });

  // ── Loading / error states ─────────────────────────────────────────────────

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

  // ── Blocking alert classification ─────────────────────────────────────────
  // Only show inline alerts that block the live session from functioning.
  // Non-blocking alerts (weak signal, stationary reminder, minor sync
  // interruptions) are handled by the Notifications page.
  //
  // Blocking = location permission missing/denied, session cannot sync at all.
  const isLocationBlocked =
    permissionStatus === "denied" || permissionStatus === "unsupported";
  const isOffline = connectionStatus === "offline";

  // Derive seat sync status for the selector
  const seatSyncStatus = (() => {
    if (isPinging) return "saving" as const;
    if (isOffline || uploadStatus === "offline" || queuedUpdates.length > 0)
      return "offline" as const;
    if (uploadStatus === "error" || hasPendingUpload) return "error" as const;
    return "synced" as const;
  })();

  // Use the ref timestamp if available, otherwise fall back to session's last_ping_at
  const lastEditAt = lastEditAtRef.current ?? session.last_ping_at ?? null;

  // Direction pending state
  const isDirectionPending = isPinging;

  return (
    <div className="page-container py-8 md:py-10 max-w-2xl space-y-4">
      {/* ── 2. Blocking alerts only ────────────────────────────────────────── */}
      {isLocationBlocked && (
        <PermissionBanner
          status={permissionStatus}
          onRequest={() => void requestPermission().catch(() => null)}
        />
      )}

      {isOffline && (
        <div className="rounded-[var(--radius-xl)] border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-sm font-semibold text-red-300">
            No network connection
          </div>
          <p className="mt-1 text-sm text-red-200/80">
            Seat and direction updates are queued and will sync automatically
            when you reconnect.
          </p>
          {queuedUpdates.length > 0 && (
            <button
              type="button"
              onClick={() => void retryNow()}
              className="mt-3 text-xs font-medium text-red-300 underline underline-offset-2"
            >
              Retry now ({queuedUpdates.length} pending)
            </button>
          )}
        </div>
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

      {/* ── 3. Seat control ────────────────────────────────────────────────── */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Seats
        </div>
        <FlexibleSeatSelector
          value={session.seats_left}
          onChange={(value) => void handleSeatUpdate(value)}
          disabled={isPinging}
          maxSeats={33}
          syncStatus={seatSyncStatus}
          lastSeatUpdateAt={lastEditAt}
        />
        {session.seats_left === 0 && (
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
            Full — if boarding is closed for a while, consider stopping the
            session.
          </p>
        )}
      </section>

      {/* ── 4. Direction control ───────────────────────────────────────────── */}
      <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Direction
          </div>
          {isDirectionPending && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              Updating…
            </span>
          )}
        </div>
        <DirectionToggle
          value={session.direction}
          onChange={(value) => void handleDirectionUpdate(value)}
          disabled={isPinging}
          toTownLabel="→ Town"
          fromTownLabel={`→ ${session.nganyas?.corridors?.name || "Terminal"}`}
        />
      </section>

      {/* ── 5. Compact session metrics ─────────────────────────────────────── */}
      <SessionInsights session={session} />

      {/* ── 6. Session actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="secondary"
          className="min-h-[52px]"
          onClick={() => navigate({ to: "/crew/history" })}
        >
          Session history
        </Button>
        <Button
          variant="primary"
          className="min-h-[52px] bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 shadow-none"
          isLoading={isStopping}
          onClick={requestStop}
        >
          Stop session
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showStopConfirm}
        variant="danger"
        title="Stop live session?"
        message="This will end your broadcast. Riders will no longer see your location. You can start a new session at any time."
        confirmText="Stop session"
        cancelText="Keep live"
        onConfirm={() => void confirmStop()}
        onCancel={() => setShowStopConfirm(false)}
      />
    </div>
  );
}
