import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import StagePicker from "@/components/features/StagePicker";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastContainer";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { CrewActiveSessionBanner } from "@/modules/crew/components/CrewActiveSessionBanner";
import { CrewReadinessCard } from "@/modules/crew/components/CrewReadinessCard";
import type { CrewDirectionValue } from "@/modules/crew/components/DirectionToggle";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { useCrewLocationRuntime } from "@/modules/crew/hooks/useCrewLocationRuntime";
import {
  clearCrewActiveSessionId,
  writeCrewActiveSessionId,
} from "@/modules/crew/lib/session-storage";
import { CrewAssignmentCard } from "./crew-live-setup/CrewAssignmentCard";
import { CrewLiveSettingsCard } from "./crew-live-setup/CrewLiveSettingsCard";
import { CrewMobileStickyBar } from "./crew-live-setup/CrewMobileStickyBar";
import {
  clampSeats,
  getDirectionLabels,
  getLocationPoint,
} from "./crew-live-setup/crew-live-domain";
import { useCrewLiveReadiness } from "./crew-live-setup/useCrewLiveReadiness";

export default function CrewLiveSetupScreen() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { snapshot, refresh, invalidate } = useCrewBootstrap();
  const assignment = snapshot.bootstrap.assignment;
  const rawActiveSession = snapshot.bootstrap.active_session;

  const activeSession = rawActiveSession ?? null;

  // Single location runtime instance — shared with the session screen via
  // navigation state is not needed here because the setup screen and session
  // screen are separate routes. The runtime is re-created on the session screen.
  // What matters is that within this screen, only one runtime (and therefore
  // one watcher) exists.
  const locationRuntime = useCrewLocationRuntime();

  const readiness = useCrewLiveReadiness(
    assignment,
    snapshot.bootstrap.request,
    addToast,
    locationRuntime,
  );

  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEndingActive, setIsEndingActive] = useState(false);
  const [isAssignmentExpanded, setIsAssignmentExpanded] = useState(false);
  const [showAssignmentHelp, setShowAssignmentHelp] = useState(false);

  const directionSectionRef = useRef<HTMLDivElement>(null);
  const seatsSectionRef = useRef<HTMLDivElement>(null);
  const startLiveButtonRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback(
    (target: "direction" | "seats" | "start") => {
      const refs = {
        direction: directionSectionRef.current,
        seats: seatsSectionRef.current,
        start: startLiveButtonRef.current,
      };
      const element = refs[target];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add(
          "ring-2",
          "ring-[var(--color-accent)]/50",
          "ring-offset-2",
          "ring-offset-[var(--color-bg-base)]",
        );
        setTimeout(() => {
          element.classList.remove(
            "ring-2",
            "ring-[var(--color-accent)]/50",
            "ring-offset-2",
            "ring-offset-[var(--color-bg-base)]",
          );
        }, 2000);
      }
    },
    [],
  );

  const corridorName =
    assignment?.terminal_label ||
    readiness.registrationRequest?.corridors?.name ||
    "Unknown terminal";
  const directionLabels = getDirectionLabels(corridorName);
  const controlsReady = Boolean(
    readiness.directionSelected && readiness.seatsSet,
  );
  const canStart = Boolean(
    readiness.assignmentReady && readiness.isReadyToStart,
  );
  const startIsActive = readiness.isReadyToStart;
  const directionIsActive = readiness.nextRequired === "direction";
  const seatsIsActive = readiness.nextRequired === "seats";
  const settingsNeedAttention = directionIsActive || seatsIsActive;

  const stickyHelperText = !assignment
    ? "Complete crew setup before going Live."
    : readiness.permissionStatus !== "granted"
      ? "Enable location to start Live."
      : !readiness.direction
        ? "Choose direction to continue."
        : !readiness.seatsSet
          ? "Confirm seats to continue."
          : `${assignment.nganya_name} | ${readiness.direction === "TO_TOWN" ? directionLabels.toTown : directionLabels.fromTown} | ${readiness.seatsLeft === 0 ? "Full" : `${readiness.seatsLeft} seats left`}`;

  const readinessItems = [
    {
      id: "assignment",
      label: "Assigned nganya",
      status: assignment ? "done" : "error",
      detail: assignment
        ? `${assignment.nganya_name} on ${corridorName}`
        : "Missing assignment. Complete crew setup before going Live.",
    },
    {
      id: "location",
      label: "Location permission",
      status:
        readiness.permissionStatus === "granted"
          ? "done"
          : readiness.permissionStatus === "denied" ||
              readiness.permissionStatus === "unsupported"
            ? "error"
            : "pending",
      detail:
        readiness.permissionStatus === "granted"
          ? "Permission granted and ready to share only while Live."
          : readiness.permissionStatus === "denied"
            ? "Permission blocked. Open settings and retry."
            : readiness.permissionStatus === "unsupported"
              ? "This browser cannot provide geolocation."
              : "Permission not granted yet.",
    },
    {
      id: "network",
      label: "Network",
      status:
        readiness.networkStatus === "healthy"
          ? "done"
          : readiness.networkStatus === "poor"
            ? "warning"
            : "error",
      detail:
        readiness.networkStatus === "healthy"
          ? "Connection looks stable."
          : readiness.networkStatus === "poor"
            ? "Signal looks weak. Start may retry."
            : "Offline right now.",
    },
    {
      id: "controls",
      label: "Controls set",
      status: controlsReady ? "done" : "pending",
      detail: controlsReady
        ? `${readiness.direction === "TO_TOWN" ? directionLabels.toTown : directionLabels.fromTown} | ${readiness.seatsLeft === 0 ? "Full (0 seats)" : `${readiness.seatsLeft} seats left`}`
        : "Direction and seats are required before you go live.",
    },
  ] as const;

  const handleDirectionChange = (value: CrewDirectionValue) =>
    readiness.setDirection(value);
  const handleSeatsChange = (value: number) => {
    readiness.setHasConfirmedSeats(true);
    readiness.setSeatsLeft(value);
  };
  const handleSeatStep = (delta: number) => {
    readiness.setHasConfirmedSeats(true);
    readiness.setSeatsLeft((c) => clampSeats(c + delta));
  };

  const handleStart = async () => {
    if (!assignment?.nganya_id || !assignment?.corridor_id) {
      addToast(
        "This crew account has no valid nganya assignment yet.",
        "error",
      );
      return;
    }
    if (readiness.permissionStatus !== "granted") {
      addToast("Enable location before going Live.", "error");
      return;
    }
    if (!readiness.direction) {
      addToast("Choose your direction before going Live.", "error");
      return;
    }
    if (!readiness.seatsSet) {
      addToast("Confirm seats before going Live.", "error");
      return;
    }

    setIsStarting(true);
    try {
      const liveCoords =
        readiness.coords || (await readiness.captureLocation());
      const session = await crewLiveService.startSession({
        nganyaId: assignment.nganya_id,
        corridorId: assignment.corridor_id,
        direction: readiness.direction,
        seatsLeft: readiness.seatsLeft,
        lastLocation: getLocationPoint(liveCoords),
      });
      readiness.setNetworkStatus("healthy");
      readiness.setNetworkMessage(null);
      writeCrewActiveSessionId(session.id);
      addToast("Live session started.", "success");
      navigate({ to: "/crew/session/$id", params: { id: session.id } });
    } catch (err: any) {
      const message = err?.message || "Failed to start live session.";
      if (!navigator.onLine) {
        readiness.setNetworkStatus("offline");
        readiness.setNetworkMessage("Offline. Reconnect before starting Live.");
      } else {
        readiness.setNetworkStatus("poor");
        readiness.setNetworkMessage(
          "Start failed. Retrying after a stable signal usually fixes this.",
        );
      }
      if (
        message.includes("NOT_MAPPED") ||
        message.includes("row-level security")
      ) {
        addToast(
          "This nganya is not linked to your crew account yet. Contact admin if the assignment is wrong.",
          "error",
        );
      } else {
        addToast(message, "error");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndActiveSession = async () => {
    if (!activeSession?.id) return;
    setIsEndingActive(true);
    try {
      await crewLiveService.stopSession(activeSession.id);
      clearCrewActiveSessionId();
      addToast("Live session ended.", "success");
      invalidate();
      await refresh();
    } catch (err: any) {
      addToast(err?.message || "Failed to end the active session.", "error");
    } finally {
      setIsEndingActive(false);
    }
  };

  return (
    <div className="page-container max-w-7xl py-8 md:py-10">
      <div className="mb-6 max-w-3xl">
        <p className="text-tag text-[var(--color-accent)]">Crew Live</p>
        <h1 className="mt-2 text-h1 text-white">
          {activeSession ? "You're currently Live" : "Go live fast"}
        </h1>
        <p className="mt-3 max-w-2xl text-body text-[var(--color-text-secondary)]">
          {activeSession
            ? "Resume your current session or end it before starting another one."
            : "Your assigned nganya is locked in. Set direction, confirm seats, allow location, then start broadcasting."}
        </p>
      </div>

      {activeSession ? (
        <div className="space-y-4">
          <CrewActiveSessionBanner
            session={activeSession}
            isEnding={isEndingActive}
            onEnd={() => {
              void handleEndActiveSession();
            }}
          />
        </div>
      ) : (
        <>
          <div className="xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] xl:items-start xl:gap-6">
            <div className="space-y-4">
              <CrewLiveSettingsCard
                direction={readiness.direction}
                onDirectionChange={handleDirectionChange}
                seatsLeft={readiness.seatsLeft}
                onSeatsChange={handleSeatsChange}
                onSeatStep={handleSeatStep}
                hasConfirmedSeats={readiness.hasConfirmedSeats}
                hasAssignment={Boolean(assignment)}
                settingsNeedAttention={settingsNeedAttention}
                directionLabels={directionLabels}
                directionSectionRef={directionSectionRef}
                seatsSectionRef={seatsSectionRef}
              />

              <div className="md:hidden">
                <Button
                  variant="ghost"
                  className={`min-h-[44px] w-full rounded-[18px] border px-4 text-sm font-semibold transition-all ${startIsActive ? "border-[var(--color-accent)]/35 bg-[rgba(255,45,120,0.10)] text-[var(--color-accent)] shadow-[0_12px_32px_rgba(255,45,120,0.10)]" : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]"} disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none`}
                  disabled={!readiness.isReadyToStart}
                  onClick={handleStart}
                >
                  <Radio className="h-4 w-4" />
                  Start Live
                </Button>
              </div>

              <div className="hidden md:block">
                <Button
                  variant="primary"
                  className={`min-h-[48px] w-full rounded-[18px] px-4 text-sm font-semibold transition-all disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none ${startIsActive ? "ring-1 ring-[var(--color-accent)]/35 shadow-[0_16px_42px_rgba(255,45,120,0.16)]" : ""}`}
                  isLoading={isStarting}
                  disabled={!canStart}
                  onClick={handleStart}
                >
                  <Radio className="h-4 w-4" />
                  Start Live
                </Button>
              </div>
            </div>

            <aside
              className="mt-4 space-y-4 xl:sticky xl:top-[calc(var(--top-nav-height)+24px)] xl:mt-0"
              ref={startLiveButtonRef}
            >
              <CrewReadinessCard
                items={readinessItems as any}
                permissionStatus={readiness.permissionStatus}
                lastFixAt={readiness.lastFixAt}
                gpsQuality={readiness.gpsQuality}
                networkStatus={readiness.networkStatus}
                networkMessage={readiness.networkMessage}
                readinessCount={
                  [
                    readiness.assignmentReady,
                    readiness.locationGranted,
                    readiness.directionSelected,
                    readiness.seatsSet,
                  ].filter(Boolean).length
                }
                readinessTotal={4}
                nextRequired={readiness.nextRequired}
                onSetDirection={() => scrollToSection("direction")}
                onSetSeats={() => scrollToSection("seats")}
                onEnableLocation={readiness.handleLocationAction}
              />
            </aside>
          </div>

          <div className="h-40 md:hidden" />

          <CrewMobileStickyBar
            nextRequired={readiness.nextRequired}
            permissionStatus={readiness.permissionStatus}
            stickyHelperText={stickyHelperText}
            startIsActive={startIsActive}
            isStarting={isStarting}
            canStart={canStart}
            onStart={handleStart}
            onLocationAction={readiness.handleLocationAction}
            onScrollToDirection={() => scrollToSection("direction")}
            onScrollToSeats={() => scrollToSection("seats")}
            startLiveButtonRef={startLiveButtonRef}
          />

          {assignment ? (
            <StagePicker
              isOpen={isStagePickerOpen}
              onClose={() => setIsStagePickerOpen(false)}
              corridorId={assignment.corridor_id}
              onSelect={(stageId, stageName) => {
                readiness.setSelectedStartStage({
                  id: stageId,
                  name: stageName,
                  source: "manual",
                });
                setIsStagePickerOpen(false);
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
