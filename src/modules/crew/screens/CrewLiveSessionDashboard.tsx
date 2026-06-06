/**
 * CrewLiveSessionDashboard — Compact operational cockpit for an active live session.
 *
 * Desktop layout: 3-zone dashboard
 *   Left  — CrewDashboardSidebar (nav rail)
 *   Center — Live operations workspace (session header + controls)
 *   Right  — CrewSessionRightRail (fan activity, messages, alerts)
 *
 * Mobile layout: stacked priority order
 *   session header → seats → direction → tracking health → fan activity →
 *   latest message → alerts → stop session
 *
 * Architecture rules:
 *   - Data fetching and session logic stay in useCrewLiveSessionV2 (unchanged).
 *   - All dashboard cards are separate presentational components.
 *   - No Session history CTA in the body.
 *   - No Preview live view button.
 *   - No individual fan identities exposed.
 *   - Blocking alerts surfaced compactly — not as full-width banners.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { DirectionChangePrompt } from "@/modules/crew/components/DirectionChangePrompt";
import { KeyboardShortcutsHelp } from "@/modules/crew/components/KeyboardShortcutsHelp";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useCrewLocationRuntime } from "@/modules/crew/hooks/useCrewLocationRuntime";
import { useCrewLiveSessionV2 } from "@/modules/crew/hooks/useCrewLiveSessionV2";
import { clearCrewActiveSessionId } from "@/modules/crew/lib/session-storage";
import {
  useKeyboardShortcuts,
  getCrewLiveShortcuts,
} from "@/modules/crew/hooks/useKeyboardShortcuts";
import {
  hapticSeatUpdate,
  hapticDirectionChange,
  hapticSessionStop,
} from "@/modules/crew/lib/haptics";

// Dashboard components
import { ActiveSessionSummaryStrip } from "@/modules/crew/components/dashboard/ActiveSessionSummaryStrip";
import { SeatsControlCard } from "@/modules/crew/components/dashboard/SeatsControlCard";
import { DirectionControlCard } from "@/modules/crew/components/dashboard/DirectionControlCard";
import { TrackingHealthCard } from "@/modules/crew/components/dashboard/TrackingHealthCard";
import { SessionMetricsCard } from "@/modules/crew/components/dashboard/SessionMetricsCard";
import { FanInsightsCard } from "@/modules/crew/components/dashboard/FanInsightsCard";
import { LatestMessageCard } from "@/modules/crew/components/dashboard/LatestMessageCard";
import { AlertsSummaryCard } from "@/modules/crew/components/dashboard/AlertsSummaryCard";
import { CrewDashboardSidebar } from "@/modules/crew/components/dashboard/CrewDashboardSidebar";
import { CrewSessionRightRail } from "@/modules/crew/components/dashboard/CrewSessionRightRail";
import type { ActiveAlert } from "@/modules/crew/components/dashboard/AlertsSummaryCard";
import type { CrewDirectionValue } from "@/modules/crew/components/DirectionToggle";
import Button from "@/components/ui/Button";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CrewLiveSessionDashboardProps {
  sessionId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CrewLiveSessionDashboard({
  sessionId,
}: CrewLiveSessionDashboardProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [initialSession, setInitialSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [showDirectionPrompt, setShowDirectionPrompt] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Track when the last edit (seat or direction) was sent
  const lastEditAtRef = useRef<string | null>(null);

  // ── Location runtime ───────────────────────────────────────────────────────
  const locationRuntime = useCrewLocationRuntime();

  // ── Load session ───────────────────────────────────────────────────────────
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

  // ── Session hook ───────────────────────────────────────────────────────────
  const {
    session,
    permissionStatus,
    connectionStatus,
    isPinging,
    queuedUpdates,
    requestPermission,
    updateSeats,
    updateDirection,
    stopSession,
    retryNow,
    uploadStatus,
    clientState,
    lastPingAgeMs,
    hasPendingUpload,
  } = useCrewLiveSessionV2({
    initialSession,
    locationRuntime,
    onDirectionChangeDetected: () => setShowDirectionPrompt(true),
  });

  // ── Stop session flow ──────────────────────────────────────────────────────
  const requestStop = () => setShowStopConfirm(true);

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

  // ── Seat / direction handlers ──────────────────────────────────────────────
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

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const shortcuts = getCrewLiveShortcuts({
    incrementSeats: () => {
      if (session && !isPinging)
        void handleSeatUpdate(clampSeats(session.seats_left + 1));
    },
    decrementSeats: () => {
      if (session && !isPinging)
        void handleSeatUpdate(clampSeats(session.seats_left - 1));
    },
    setFull: () => {
      if (session && !isPinging) void handleSeatUpdate(0);
    },
    toggleDirection: () => {
      if (session && !isPinging) {
        const next = session.direction === "TO_TOWN" ? "FROM_TOWN" : "TO_TOWN";
        void handleDirectionUpdate(next);
      }
    },
    stopSession: () => {
      if (!isStopping) requestStop();
    },
  });

  useKeyboardShortcuts({ shortcuts, enabled: !isLoading && !loadError });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--bottom-nav-height))] md:h-[calc(100vh-var(--top-nav-height))] items-center justify-center">
        <div className="text-sm text-(--color-text-secondary) animate-pulse">
          Loading live session…
        </div>
      </div>
    );
  }

  // ── Error / no session state ───────────────────────────────────────────────
  if (loadError || !session) {
    return (
      <div className="page-container py-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
          {loadError || "This live session is not available."}
        </div>
        <Link
          to="/crew/live"
          className="mt-4 inline-block text-sm text-(--color-accent) no-underline"
        >
          Back to crew live setup
        </Link>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const isOffline = connectionStatus === "offline";
  const isLocationBlocked =
    permissionStatus === "denied" || permissionStatus === "unsupported";

  // Seat sync status
  const seatSyncStatus = (() => {
    if (isPinging) return "saving" as const;
    if (isOffline || uploadStatus === "offline" || queuedUpdates.length > 0)
      return "offline" as const;
    if (uploadStatus === "error" || hasPendingUpload) return "error" as const;
    return "synced" as const;
  })();

  const lastEditAt = lastEditAtRef.current ?? session.last_ping_at ?? null;

  // Derive active alerts
  const activeAlerts: ActiveAlert[] = [];
  if (isLocationBlocked) {
    activeAlerts.push({
      label:
        permissionStatus === "unsupported"
          ? "Location unavailable"
          : "Location permission needed",
      severity: "error",
    });
  }
  if (isOffline) {
    activeAlerts.push({
      label: "No network — updates queued",
      severity: "warn",
    });
  }
  if (uploadStatus === "error" || hasPendingUpload) {
    activeAlerts.push({ label: "Sync failed — will retry", severity: "warn" });
  }

  // Corridor / nganya labels
  const corridorName =
    session.nganyas?.corridors?.name ?? session.corridor_id ?? "Route";
  const nganyaName = session.nganyas?.name ?? "Nganya";
  const fromTownLabel = `→ ${corridorName}`;

  // Estimate total updates from session duration (approx every 15 s)
  const totalUpdates = Math.floor(
    (Date.now() - new Date(session.started_at).getTime()) / 15_000,
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        ── 3-Zone Dashboard Shell ──────────────────────────────────────────────
        Desktop: sidebar (200px) | center (flex-1, scrollable) | right rail (220-240px)
        Tablet:  sidebar hidden, center full-width, right rail hidden
        Mobile:  single column, stacked
      */}
      {/*
        On desktop: top nav is sticky (--top-nav-height = 64px), so we subtract it.
        On mobile: top nav is hidden (md:block), so we use full viewport height
        minus the bottom nav (--bottom-nav-height = 72px).
      */}
      <div className="flex h-[calc(100vh-var(--bottom-nav-height))] md:h-[calc(100vh-var(--top-nav-height))] overflow-hidden">
        {/* ── Zone 1: Left sidebar ─────────────────────────────────────────── */}
        <CrewDashboardSidebar />

        {/* ── Zone 2: Center operations workspace ──────────────────────────── */}
        <main
          className="flex-1 overflow-y-auto min-w-0"
          aria-label="Live session operations"
        >
          <div className="p-4 md:p-5 space-y-3 max-w-2xl mx-auto lg:max-w-none pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] md:pb-6">
            {/* ── A. Compact session header ─────────────────────────────────── */}
            <ActiveSessionSummaryStrip
              nganyaName={nganyaName}
              corridorName={corridorName}
              direction={session.direction}
              startedAt={session.started_at}
              lastUpdateAgeMs={lastPingAgeMs}
            />

            {/* ── B+C. Primary controls: Seats + Direction ──────────────────── */}
            {/*
              Desktop: side-by-side 2-col
              Mobile: stacked (seats first — highest priority)
            */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* B. Seats — primary operational control */}
              <SeatsControlCard
                seats={session.seats_left}
                onSeatsChange={(value) => void handleSeatUpdate(value)}
                disabled={isPinging}
                syncStatus={seatSyncStatus}
                lastSeatUpdateAt={lastEditAt}
                maxSeats={33}
              />

              {/* C. Direction */}
              <DirectionControlCard
                direction={session.direction as CrewDirectionValue | null}
                onDirectionChange={(value) => void handleDirectionUpdate(value)}
                disabled={isPinging}
                isPending={isPinging}
                toTownLabel="→ Town"
                fromTownLabel={fromTownLabel}
              />
            </div>

            {/* ── D+E. Tracking health + Session metrics ────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* D. Tracking health */}
              <TrackingHealthCard
                locationReadiness={locationRuntime.readiness}
                isWatching={locationRuntime.isWatching}
                uploadStatus={uploadStatus}
                clientState={clientState}
                lastUploadAgeMs={lastPingAgeMs}
                hasPendingUpload={hasPendingUpload}
                onRetry={() => void retryNow()}
              />

              {/* E. Session metrics */}
              <SessionMetricsCard
                startedAt={session.started_at}
                seats={session.seats_left}
                totalUpdates={totalUpdates}
              />
            </div>

            {/* ── Mobile-only: Fan activity + Messages ─────────────────────── */}
            {/*
              On desktop these live in the right rail.
              On mobile (lg:hidden) they appear inline in priority order.
            */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FanInsightsCard data={null} />
              <LatestMessageCard latestMessage={null} inboxEnabled={false} />
            </div>

            {/* ── Mobile-only: Alerts summary ───────────────────────────────── */}
            {activeAlerts.length > 0 && (
              <div className="lg:hidden">
                <AlertsSummaryCard alerts={activeAlerts} />
              </div>
            )}

            {/* ── Location permission inline action ─────────────────────────── */}
            {isLocationBlocked && permissionStatus !== "unsupported" && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-200">
                  {permissionStatus === "denied"
                    ? "Location permission is blocked. Open browser settings, allow location for this site, then retry."
                    : "Location permission is needed to keep this session live."}
                </p>
                <button
                  type="button"
                  onClick={() => void requestPermission().catch(() => null)}
                  className="mt-2 text-xs font-semibold text-red-300 underline underline-offset-2"
                >
                  {permissionStatus === "denied"
                    ? "Retry permission"
                    : "Enable location"}
                </button>
              </div>
            )}

            {/* ── Offline queued updates notice ─────────────────────────────── */}
            {isOffline && queuedUpdates.length > 0 && (
              <div className="rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] px-4 py-3">
                <p className="text-sm text-(--color-warning)">
                  {queuedUpdates.length} update
                  {queuedUpdates.length !== 1 ? "s" : ""} queued — will sync
                  when back online.
                </p>
                <button
                  type="button"
                  onClick={() => void retryNow()}
                  className="mt-1 text-xs font-medium text-(--color-warning) underline underline-offset-2"
                >
                  Retry now
                </button>
              </div>
            )}

            {/* ── F. Stop session — deliberate, not dominant ────────────────── */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-(--glass-border)">
              {/* Keyboard shortcuts help — utility, not a primary CTA */}
              <KeyboardShortcutsHelp shortcuts={shortcuts} />

              {/* Stop session */}
              <Button
                variant="primary"
                size="md"
                className="bg-(--color-error) hover:bg-(--color-error)/90 shadow-none min-h-[44px] px-5"
                isLoading={isStopping}
                onClick={requestStop}
                aria-label="Stop live session"
              >
                Stop session
              </Button>
            </div>
          </div>
        </main>

        {/* ── Zone 3: Right activity / insights rail ────────────────────────── */}
        <CrewSessionRightRail
          nganyaName={nganyaName}
          corridorName={corridorName}
          isLive={true}
          fanData={null}
          latestMessage={null}
          alerts={activeAlerts}
          onOpenNotifications={() => navigate({ to: "/crew/notifications" })}
          className="overflow-y-auto"
        />
      </div>

      {/* ── Direction change prompt ──────────────────────────────────────────── */}
      {showDirectionPrompt && (
        <DirectionChangePrompt
          currentDirection={session.direction}
          toTownLabel="→ Town"
          fromTownLabel={fromTownLabel}
          onConfirm={handleDirectionPromptConfirm}
          onDismiss={() => setShowDirectionPrompt(false)}
          isUpdating={isPinging}
        />
      )}

      {/* ── Stop confirmation dialog ─────────────────────────────────────────── */}
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
    </>
  );
}
