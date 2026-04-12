import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  MapPin,
  Minus,
  Plus,
  Radio,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import StagePicker from "@/components/features/StagePicker";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { stageRepository } from "@/entities/stage/repository";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { nganyaRegistrationService } from "@/features/nganya-registration/services/nganya-registration-service";
import { CrewActiveSessionBanner } from "@/modules/crew/components/CrewActiveSessionBanner";
import { CrewReadinessCard } from "@/modules/crew/components/CrewReadinessCard";
import {
  DirectionToggle,
  type CrewDirectionValue,
} from "@/modules/crew/components/DirectionToggle";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { SeatsQuickButtons } from "@/modules/crew/components/SeatsQuickButtons";
import { SpotlightCard } from "@/modules/crew/components/SpotlightCard";
import {
  clearCrewActiveSessionId,
  readCrewSetupDraft,
  writeCrewActiveSessionId,
  writeCrewSetupDraft,
} from "@/modules/crew/lib/storage";

type PermissionStateLocal = "prompt" | "granted" | "denied" | "unsupported";
type NetworkStateLocal = "healthy" | "poor" | "offline";

interface Coords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

interface StageOption {
  id: string;
  name: string;
  location: unknown;
}

interface StartStageChoice {
  id: string;
  name: string;
  source: "auto" | "manual";
}

function clampSeats(value: number) {
  return Math.max(0, Math.min(20, value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function getDirectionLabels(corridorName: string | null | undefined) {
  return {
    toTown: "-> Town",
    fromTown: corridorName ? `-> ${corridorName}` : "-> Terminal",
  };
}

function parsePoint(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null;

  if (typeof location === "string") {
    const pointMatch = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (pointMatch) {
      return { lng: Number(pointMatch[1]), lat: Number(pointMatch[2]) };
    }

    try {
      const parsed = JSON.parse(location);
      if (
        parsed?.type === "Point" &&
        Array.isArray(parsed.coordinates) &&
        parsed.coordinates.length >= 2
      ) {
        return {
          lng: Number(parsed.coordinates[0]),
          lat: Number(parsed.coordinates[1]),
        };
      }
    } catch {
      return null;
    }
  }

  if (typeof location === "object" && location !== null) {
    const geo = location as any;
    if (
      geo?.type === "Point" &&
      Array.isArray(geo.coordinates) &&
      geo.coordinates.length >= 2
    ) {
      return {
        lng: Number(geo.coordinates[0]),
        lat: Number(geo.coordinates[1]),
      };
    }

    if (typeof geo.lat === "number" && typeof geo.lng === "number") {
      return { lat: geo.lat, lng: geo.lng };
    }

    if (typeof geo.latitude === "number" && typeof geo.longitude === "number") {
      return { lat: geo.latitude, lng: geo.longitude };
    }
  }

  return null;
}

function getDistanceKm(from: Coords, to: { lat: number; lng: number }) {
  const toRad = (degrees: number) => degrees * (Math.PI / 180);
  const earthKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(a));
}

function detectNearestStage(
  stages: StageOption[],
  coords: Coords | null,
): StartStageChoice | null {
  if (!coords || !stages.length) return null;

  let bestStage: StageOption | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const stage of stages) {
    const stagePoint = parsePoint(stage.location);
    if (!stagePoint) continue;

    const distance = getDistanceKm(coords, stagePoint);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestStage = stage;
    }
  }

  if (!bestStage) return null;

  return {
    id: bestStage.id,
    name: bestStage.name,
    source: "auto",
  };
}

function getLocationPoint(coords: Coords) {
  return `POINT(${coords.lng} ${coords.lat})`;
}

function getGpsQuality(accuracy: number | null): "good" | "weak" | null {
  if (accuracy == null || !Number.isFinite(accuracy)) return null;
  return accuracy <= 50 ? "good" : "weak";
}

export default function CrewLiveSetupScreen() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { snapshot, refresh, invalidate } = useCrewBootstrap();
  const permissionWatcherRef = useRef<PermissionStatus | null>(null);
  const assignment = snapshot.bootstrap.assignment;
  const rawActiveSession = snapshot.bootstrap.active_session;

  // Only consider session active if it's LIVE and not ended
  const activeSession =
    rawActiveSession?.status === "LIVE" && !rawActiveSession?.ended_at
      ? rawActiveSession
      : null;

  const [registrationRequest, setRegistrationRequest] = useState<any>(null);
  const [lastLiveAt, setLastLiveAt] = useState<string | null>(null);
  const [direction, setDirection] = useState<CrewDirectionValue | null>(() => {
    const draft = readCrewSetupDraft();
    return draft?.direction || null;
  });
  const [seatsLeft, setSeatsLeft] = useState(() => {
    const draft = readCrewSetupDraft();
    return clampSeats(draft?.seatsLeft ?? 10);
  });
  const [hasConfirmedSeats, setHasConfirmedSeats] = useState(() => {
    const draft = readCrewSetupDraft();
    return Boolean(draft?.seatsConfirmed);
  });
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStateLocal>("prompt");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [lastFixAt, setLastFixAt] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStateLocal>(
    typeof navigator === "undefined" || navigator.onLine
      ? "healthy"
      : "offline",
  );
  const [networkMessage, setNetworkMessage] = useState<string | null>(null);
  const [isMobileReadinessExpanded, setIsMobileReadinessExpanded] =
    useState(false);
  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [selectedStartStage, setSelectedStartStage] =
    useState<StartStageChoice | null>(null);
  const [showAssignmentHelp, setShowAssignmentHelp] = useState(false);
  const [isAssignmentExpanded, setIsAssignmentExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEndingActive, setIsEndingActive] = useState(false);

  // Guided attention: refs for scroll-to-focus
  const directionSectionRef = useRef<HTMLDivElement>(null);
  const seatsSectionRef = useRef<HTMLDivElement>(null);
  const startLiveButtonRef = useRef<HTMLButtonElement>(null);

  // Guided attention: scroll to target section
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
        // Add subtle focus highlight
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

  const assignmentReady = Boolean(assignment?.nganya_id);
  const locationGranted = permissionStatus === "granted";
  const directionSelected = Boolean(direction);
  const seatsSet = hasConfirmedSeats;
  const readinessTotal = 4;
  const readinessCount = [
    assignmentReady,
    locationGranted,
    directionSelected,
    seatsSet,
  ].filter(Boolean).length;

  const nextRequired = !locationGranted
    ? "location"
    : !directionSelected
      ? "direction"
      : !seatsSet
        ? "seats"
        : "start";

  const isReadyToStart = assignmentReady && nextRequired === "start";

  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermissionStatus("unsupported");
      throw new Error("This browser does not support geolocation.");
    }

    // We intentionally bypass navigator.permissions.query here because
    // on some mobile browsers it falsely reports "denied" or prevents
    // the native prompt from appearing. We rely entirely on getCurrentPosition.

    return new Promise<Coords>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        setPermissionStatus("prompt");
        reject(
          new Error(
            "Location request timed out. Please ensure location is enabled and try again.",
          ),
        );
      }, 15000); // Increased timeout for mobile

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const nextCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
          };

          setCoords(nextCoords);
          setPermissionStatus("granted");
          setLastFixAt(new Date().toISOString());
          resolve(nextCoords);
        },
        (error) => {
          clearTimeout(timeoutId);
          let errorMessage = "Location permission is required to go Live.";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              setPermissionStatus("denied");
              if (
                typeof window !== "undefined" &&
                window.isSecureContext === false
              ) {
                errorMessage =
                  "Location requires a secure connection. Please use HTTPS or localhost.";
              } else {
                errorMessage =
                  "Location permission denied. Please enable location in your browser settings or app settings.";
              }
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage =
                "Location information is unavailable. Please check your device's location services.";
              break;
            case error.TIMEOUT:
              setPermissionStatus("prompt");
              errorMessage =
                "Location request timed out. Please ensure location is enabled and try again.";
              break;
            default:
              setPermissionStatus("prompt");
              errorMessage =
                "An unknown error occurred while getting location.";
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000, // Increased for mobile
          maximumAge: 3000, // Slightly reduced for freshness
        },
      );
    });
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      crewLiveService.listHistory(1),
      snapshot.bootstrap.request
        ? nganyaRegistrationService.listMyRequests({ limit: 1 })
        : Promise.resolve([]),
    ])
      .then(([history, requests]) => {
        if (!active) return;
        setLastLiveAt(
          history?.[0]?.ended_at || history?.[0]?.started_at || null,
        );
        setRegistrationRequest((requests as any[])?.[0] || null);
        setShowAssignmentHelp(false);
      })
      .catch((loadError: any) => {
        if (!active) return;
        addToast(
          loadError?.message || "Failed to load your assigned nganya.",
          "error",
        );
      });

    return () => {
      active = false;
    };
  }, [snapshot.bootstrap.request?.id]);

  useEffect(() => {
    if (!assignment?.corridor_id) {
      setStages([]);
      return;
    }

    let active = true;

    stageRepository
      .listByCorridor(assignment.corridor_id)
      .then((data) => {
        if (!active) return;
        setStages((data || []) as StageOption[]);
      })
      .catch(() => {
        if (!active) return;
        setStages([]);
      });

    return () => {
      active = false;
    };
  }, [assignment?.corridor_id]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const handleOnline = () => {
      setNetworkStatus("healthy");
      setNetworkMessage(null);
    };

    const handleOffline = () => {
      setNetworkStatus("offline");
      setNetworkMessage("Offline. Reconnect before starting Live.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    if (!navigator.geolocation) {
      setPermissionStatus("unsupported");
      return;
    }

    if (!("permissions" in navigator) || !navigator.permissions?.query) {
      setPermissionStatus("prompt");
      return;
    }

    let active = true;

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (!active) return;

        permissionWatcherRef.current = status;
        const nextStatus =
          status.state === "granted"
            ? "granted"
            : status.state === "denied"
              ? "denied"
              : "prompt";

        setPermissionStatus(nextStatus);

        if (nextStatus === "granted") {
          void captureLocation().catch(() => null);
        }

        status.onchange = () => {
          const updatedStatus =
            status.state === "granted"
              ? "granted"
              : status.state === "denied"
                ? "denied"
                : "prompt";

          setPermissionStatus(updatedStatus);

          if (updatedStatus === "granted") {
            void captureLocation().catch(() => null);
          }
        };
      })
      .catch(() => {
        setPermissionStatus("prompt");
      });

    return () => {
      active = false;
      if (permissionWatcherRef.current) {
        permissionWatcherRef.current.onchange = null;
      }
    };
  }, [captureLocation]);

  useEffect(() => {
    if (!assignment) return;
    const draft = {
      direction,
      seatsLeft,
      seatsConfirmed: hasConfirmedSeats,
    };
    console.log("Saving crew setup draft:", draft);
    writeCrewSetupDraft(draft);
  }, [assignment, direction, seatsLeft, hasConfirmedSeats]);

  const autoDetectedStage = useMemo(
    () => detectNearestStage(stages, coords),
    [coords, stages],
  );

  useEffect(() => {
    if (!autoDetectedStage) return;

    setSelectedStartStage((current) => {
      if (current?.source === "manual") {
        return current;
      }

      if (current?.id === autoDetectedStage.id && current?.source === "auto") {
        return current;
      }

      return autoDetectedStage;
    });
  }, [autoDetectedStage]);

  const corridorName =
    assignment?.terminal_label ||
    registrationRequest?.corridors?.name ||
    "Unknown terminal";
  const directionLabels = getDirectionLabels(corridorName);
  const controlsReady = Boolean(directionSelected && seatsSet);
  const canStart = Boolean(assignmentReady && isReadyToStart);
  const gpsQuality = getGpsQuality(coords?.accuracy ?? null);
  const mobileReadinessCollapsed =
    readinessCount > 1 && !isMobileReadinessExpanded;
  const directionIsActive = nextRequired === "direction";
  const seatsIsActive = nextRequired === "seats";
  const startIsActive = isReadyToStart;
  const settingsNeedAttention = directionIsActive || seatsIsActive;
  const stickyHelperText = !assignment
    ? "Complete crew setup before going Live."
    : permissionStatus !== "granted"
      ? "Enable location to start Live."
      : !direction
        ? "Choose direction to continue."
        : !seatsSet
          ? "Confirm seats to continue."
          : `${assignment.nganya_name} | ${direction === "TO_TOWN" ? directionLabels.toTown : directionLabels.fromTown} | ${seatsLeft === 0 ? "Full" : `${seatsLeft} seats left`}`;

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
        permissionStatus === "granted"
          ? "done"
          : permissionStatus === "denied" || permissionStatus === "unsupported"
            ? "error"
            : "pending",
      detail:
        permissionStatus === "granted"
          ? "Permission granted and ready to share only while Live."
          : permissionStatus === "denied"
            ? "Permission blocked. Open settings and retry."
            : permissionStatus === "unsupported"
              ? "This browser cannot provide geolocation."
              : "Permission not granted yet.",
    },
    {
      id: "network",
      label: "Network",
      status:
        networkStatus === "healthy"
          ? "done"
          : networkStatus === "poor"
            ? "warning"
            : "error",
      detail:
        networkStatus === "healthy"
          ? "Connection looks stable."
          : networkStatus === "poor"
            ? "Signal looks weak. Start may retry."
            : "Offline right now.",
    },
    {
      id: "controls",
      label: "Controls set",
      status: controlsReady ? "done" : "pending",
      detail: controlsReady
        ? `${direction === "TO_TOWN" ? directionLabels.toTown : directionLabels.fromTown} | ${seatsLeft === 0 ? "Full (0 seats)" : `${seatsLeft} seats left`}`
        : "Direction and seats are required before you go live.",
    },
  ] as const;

  const assignmentThumb =
    assignment?.media_thumb_url ||
    registrationRequest?.nganya_registration_request_media?.[0]?.media_url ||
    null;
  const assignmentPlateLast4 = registrationRequest?.plate_last4 || null;
  const assignmentSacco = registrationRequest?.sacco || null;

  const handleDirectionChange = (value: CrewDirectionValue) => {
    setDirection(value);
  };

  const handleSeatsChange = (value: number) => {
    setHasConfirmedSeats(true);
    setSeatsLeft(value);
  };

  const handleSeatStep = (delta: number) => {
    setHasConfirmedSeats(true);
    setSeatsLeft((current) => clampSeats(current + delta));
  };

  const handleLocationAction = useCallback(() => {
    void captureLocation().catch((permissionError: any) => {
      addToast(
        permissionError?.message ||
          "Location permission is required to go Live.",
        "error",
      );
    });
  }, [addToast, captureLocation]);

  const ghostCtaLabel =
    nextRequired === "location"
      ? "Enable location to start"
      : nextRequired === "direction"
        ? "Set direction to start"
        : nextRequired === "seats"
          ? "Set seats to start"
          : "Start Live";

  const handleStart = async () => {
    if (!assignment?.nganya_id || !assignment?.corridor_id) {
      addToast(
        "This crew account has no valid nganya assignment yet.",
        "error",
      );
      return;
    }

    if (permissionStatus !== "granted") {
      addToast("Enable location before going Live.", "error");
      return;
    }

    if (!direction) {
      addToast("Choose your direction before going Live.", "error");
      return;
    }

    if (!seatsSet) {
      addToast("Confirm seats before going Live.", "error");
      return;
    }

    setIsStarting(true);

    try {
      const liveCoords = coords || (await captureLocation());
      const session = await crewLiveService.startSession({
        nganyaId: assignment.nganya_id,
        corridorId: assignment.corridor_id,
        direction,
        seatsLeft,
        lastLocation: getLocationPoint(liveCoords),
      });

      setNetworkStatus("healthy");
      setNetworkMessage(null);
      writeCrewActiveSessionId(session.id);
      addToast("Live session started.", "success");
      navigate({ to: "/crew/session/$id", params: { id: session.id } });
    } catch (startError: any) {
      const message = startError?.message || "Failed to start live session.";

      if (!navigator.onLine) {
        setNetworkStatus("offline");
        setNetworkMessage("Offline. Reconnect before starting Live.");
      } else {
        setNetworkStatus("poor");
        setNetworkMessage(
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
      invalidate(); // Clear cache to force fresh fetch
      await refresh();
    } catch (stopError: any) {
      addToast(
        stopError?.message || "Failed to end the active session.",
        "error",
      );
    } finally {
      setIsEndingActive(false);
    }
  };

  return (
    <div className="page-container max-w-7xl py-8 md:py-10">
      <div className="mb-6 max-w-3xl">
        <p className="text-tag text-[var(--color-accent)]">Crew Live</p>
        <h1 className="mt-2 text-h1 text-white">
          {activeSession ? "You’re currently Live" : "Go live fast"}
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
            <div className="space-y-4 xl:order-2">
              <section className="rounded-[28px] border border-white/[0.08] bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)]">
                <div className="flex flex-col gap-4">
                  <div className="h-48 w-full overflow-hidden rounded-[22px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] xl:h-56">
                    {assignmentThumb ? (
                      <img
                        src={assignmentThumb}
                        alt={assignment?.nganya_name || "Assigned nganya"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-caption text-[var(--color-text-tertiary)]">
                        No image yet
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-[999px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1 text-caption text-[var(--color-text-secondary)]">
                        Assigned nganya
                      </div>
                      <div className="rounded-[999px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1 text-caption text-[var(--color-text-secondary)]">
                        {corridorName}
                      </div>
                      <div
                        className={`rounded-[999px] border px-3 py-1 text-caption ${
                          assignment?.is_verified
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        {assignment?.is_verified ? "Verified" : "Pending"}
                      </div>
                      {assignment && (
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--glass-border)] text-[var(--color-text-tertiary)] transition-transform hover:border-[var(--glass-border-hover)]"
                          onClick={() =>
                            setIsAssignmentExpanded((current) => !current)
                          }
                          aria-label={
                            isAssignmentExpanded
                              ? "Collapse details"
                              : "Expand details"
                          }
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${isAssignmentExpanded ? "rotate-180" : "rotate-0"}`}
                          />
                        </button>
                      )}
                    </div>

                    <h2 className="mt-3 text-h2 text-white">
                      {assignment?.nganya_name || "Assignment missing"}
                    </h2>

                    {assignment ? (
                      <>
                        {/* Compact view (default) */}
                        {!isAssignmentExpanded && (
                          <div className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--color-text-tertiary)]">
                                Plate hint
                              </span>
                              <span>
                                {assignmentPlateLast4
                                  ? `****${assignmentPlateLast4}`
                                  : "Not available"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--color-text-tertiary)]">
                                SACCO
                              </span>
                              <span>{assignmentSacco || "Not provided"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--color-text-tertiary)]">
                                Last live
                              </span>
                              <span>
                                {formatDateTime(lastLiveAt) || "Never"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Expanded view */}
                        {isAssignmentExpanded && (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                              <div className="text-caption text-[var(--color-text-tertiary)]">
                                Plate hint
                              </div>
                              <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                                {assignmentPlateLast4
                                  ? `****${assignmentPlateLast4}`
                                  : "Not available"}
                              </div>
                            </div>
                            <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                              <div className="text-caption text-[var(--color-text-tertiary)]">
                                SACCO
                              </div>
                              <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                                {assignmentSacco || "Not provided"}
                              </div>
                            </div>
                            <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                              <div className="text-caption text-[var(--color-text-tertiary)]">
                                Last live
                              </div>
                              <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                                {formatDateTime(lastLiveAt) ||
                                  "No previous live session yet"}
                              </div>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          className="mt-4 w-full text-center text-sm text-[var(--color-accent)]"
                          onClick={() =>
                            setShowAssignmentHelp((current) => !current)
                          }
                        >
                          Wrong assignment?
                        </button>

                        {showAssignmentHelp ? (
                          <div className="mt-2 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                            Share your crew account email with a MATWANA admin
                            if this nganya or route terminal is incorrect.
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-4 rounded-[20px] border border-amber-500/25 bg-amber-500/8 p-4">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">
                              No assigned nganya yet
                            </div>
                            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                              Complete crew setup before going Live.
                            </div>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                              <Link
                                to="/crew"
                                className="inline-flex min-h-[44px] items-center justify-center rounded-[16px] border border-[var(--glass-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-all hover:border-[var(--glass-border-hover)]"
                              >
                                Complete crew setup
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* {assignment && permissionStatus === "granted" ? (
                <section
                  className={`rounded-[28px] border p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)] transition-all duration-300 md:p-6 ${
                    settingsNeedAttention
                      ? "border-white/[0.05] bg-[rgba(23,23,31,0.74)]"
                      : "border-white/[0.08] bg-[rgba(23,23,31,0.94)]"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-caption text-[var(--color-text-tertiary)]">
                        Starting near
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        <MapPin className="h-4 w-4 text-[var(--color-accent)]" />
                        <span>
                          {selectedStartStage
                            ? `${selectedStartStage.name} (${selectedStartStage.source === "auto" ? "auto" : "manual"})`
                            : "Detecting nearest stage..."}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Auto-detected from your current location on the assigned
                        route.
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      className="min-h-[44px] rounded-[16px] px-4 text-sm font-semibold"
                      onClick={() => setIsStagePickerOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                </section>
              ) : null} */}
            </div>

            <aside className="mt-4 space-y-4 xl:order-1 xl:sticky xl:top-[calc(var(--top-nav-height)+24px)] xl:mt-0">
              <div className="xl:hidden">
                <CrewReadinessCard
                  items={readinessItems as any}
                  permissionStatus={permissionStatus}
                  lastFixAt={lastFixAt}
                  gpsQuality={gpsQuality}
                  networkStatus={networkStatus}
                  networkMessage={networkMessage}
                  readinessCount={readinessCount}
                  readinessTotal={readinessTotal}
                  compact
                  collapsed={mobileReadinessCollapsed}
                  nextRequired={nextRequired}
                  onSetDirection={() => scrollToSection("direction")}
                  onSetSeats={() => scrollToSection("seats")}
                  onToggle={() =>
                    setIsMobileReadinessExpanded((current) => !current)
                  }
                  onEnableLocation={handleLocationAction}
                />
              </div>

              <div className="hidden xl:block" ref={startLiveButtonRef}>
                <CrewReadinessCard
                  items={readinessItems as any}
                  permissionStatus={permissionStatus}
                  lastFixAt={lastFixAt}
                  gpsQuality={gpsQuality}
                  networkStatus={networkStatus}
                  networkMessage={networkMessage}
                  readinessCount={readinessCount}
                  readinessTotal={readinessTotal}
                  nextRequired={nextRequired}
                  onSetDirection={() => scrollToSection("direction")}
                  onSetSeats={() => scrollToSection("seats")}
                  onEnableLocation={handleLocationAction}
                />
              </div>

              {/* Ghost Start Live CTA near Preflight */}
              <div className="xl:hidden">
                <Button
                  variant="ghost"
                  className={`min-h-[44px] w-full rounded-[18px] border px-4 text-sm font-semibold transition-all ${
                    startIsActive
                      ? "border-[var(--color-accent)]/35 bg-[rgba(255,45,120,0.10)] text-[var(--color-accent)] shadow-[0_12px_32px_rgba(255,45,120,0.10)]"
                      : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]"
                  } disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none`}
                  disabled={!isReadyToStart}
                  onClick={handleStart}
                >
                  <Radio className="h-4 w-4" />
                  {ghostCtaLabel}
                </Button>
              </div>

              {/* <div className="hidden xl:block">
                <Button
                  variant="ghost"
                  className={`min-h-[44px] w-full rounded-[18px] border px-4 text-sm font-semibold transition-all ${
                    startIsActive
                      ? "border-[var(--color-accent)]/35 bg-[rgba(255,45,120,0.10)] text-[var(--color-accent)] shadow-[0_12px_32px_rgba(255,45,120,0.10)]"
                      : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]"
                  } disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none`}
                  disabled={!isReadyToStart}
                  onClick={handleStart}
                >
                  <Radio className="h-4 w-4" />
                  {ghostCtaLabel}
                </Button>
              </div> */}

              {/* Combined Live settings with spotlight */}
              <SpotlightCard
                isActive={settingsNeedAttention}
                showRequiredChip={settingsNeedAttention}
              >
                <div className="text-caption text-[var(--color-text-tertiary)]">
                  Live settings (required)
                </div>
                <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                  These are shown to riders in the live feed.
                </div>

                <div
                  ref={directionSectionRef}
                  className={`mt-4 rounded-[22px] border px-4 py-4 transition-all ${
                    directionIsActive
                      ? "border-[var(--color-accent)]/35 bg-[rgba(255,45,120,0.07)] shadow-[0_10px_28px_rgba(255,45,120,0.08)]"
                      : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.28)]"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Direction
                    </div>
                    {directionIsActive ? (
                      <div className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--color-accent)]">
                        REQUIRED
                      </div>
                    ) : null}
                  </div>
                  <DirectionToggle
                    value={direction}
                    onChange={handleDirectionChange}
                    disabled={!assignment}
                    toTownLabel={directionLabels.toTown}
                    fromTownLabel={directionLabels.fromTown}
                  />
                  <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
                    This is what riders will see on the live feed.
                  </div>
                </div>

                <div
                  ref={seatsSectionRef}
                  className={`mt-4 rounded-[22px] border px-4 py-4 transition-all ${
                    seatsIsActive
                      ? "border-[var(--color-accent)]/35 bg-[rgba(255,45,120,0.07)] shadow-[0_10px_28px_rgba(255,45,120,0.08)]"
                      : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.28)]"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Seats
                    </div>
                    {seatsIsActive ? (
                      <div className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--color-accent)]">
                        REQUIRED
                      </div>
                    ) : null}
                  </div>
                  <SeatsQuickButtons
                    value={seatsLeft}
                    onChange={handleSeatsChange}
                    disabled={!assignment}
                    isConfirmed={hasConfirmedSeats}
                  />

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-primary)]"
                      onClick={() => handleSeatStep(-1)}
                      disabled={!assignment || seatsLeft === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex-1 rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-center text-body-sm text-[var(--color-text-secondary)]">
                      {!hasConfirmedSeats
                        ? "Confirm seats left"
                        : seatsLeft === 0
                          ? "Full (0 seats)"
                          : `${seatsLeft} seats left`}
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-primary)]"
                      onClick={() => handleSeatStep(1)}
                      disabled={!assignment}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
                    {seatsLeft === 0
                      ? "Full selected. Consider stopping Live when boarding is fully closed."
                      : "Keep it honest - it affects recommendations."}
                  </div>
                </div>
              </SpotlightCard>

              <div className="hidden xl:block">
                <Button
                  variant="primary"
                  className={`min-h-[48px] w-full rounded-[18px] px-4 text-sm font-semibold transition-all disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none ${
                    startIsActive
                      ? "ring-1 ring-[var(--color-accent)]/35 shadow-[0_16px_42px_rgba(255,45,120,0.16)]"
                      : ""
                  }`}
                  isLoading={isStarting}
                  disabled={!canStart}
                  onClick={handleStart}
                >
                  <Radio className="h-4 w-4" />
                  Start Live
                </Button>
              </div>
            </aside>
          </div>

          <div className="h-24 xl:hidden" />

          {/* Mobile sticky guidance bar */}
          <div className="fixed inset-x-0 bottom-0 z-[var(--z-fab)] border-t border-[var(--glass-border)] bg-[var(--color-bg-base)]/92 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl xl:hidden">
            <div className="mx-auto max-w-7xl space-y-3">
              <div className="min-w-0">
                <div className="text-caption text-[var(--color-text-tertiary)]">
                  {nextRequired === "location" && "Enable location to continue"}
                  {nextRequired === "direction" && "Set direction to continue"}
                  {nextRequired === "seats" && "Set seats to continue"}
                  {nextRequired === "start" && "Ready to go Live"}
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="truncate text-sm text-[var(--color-text-secondary)]">
                    {nextRequired === "location" && (
                      <span>
                        {permissionStatus === "denied"
                          ? "Location denied. Enable in browser settings."
                          : "Tap to enable location permission"}
                      </span>
                    )}
                    {nextRequired === "direction" &&
                      "Tap to jump to direction settings"}
                    {nextRequired === "seats" &&
                      "Tap to jump to seats settings"}
                    {nextRequired === "start" && stickyHelperText}
                  </div>
                  {nextRequired !== "start" && (
                    <button
                      type="button"
                      className="rounded-[12px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-xs font-semibold text-[var(--color-accent)]"
                      onClick={() => {
                        if (nextRequired === "location") {
                          handleLocationAction();
                        } else if (nextRequired === "direction") {
                          scrollToSection("direction");
                        } else if (nextRequired === "seats") {
                          scrollToSection("seats");
                        }
                      }}
                    >
                      {nextRequired === "location" &&
                        (permissionStatus === "denied"
                          ? "Retry location"
                          : "Enable")}
                      {nextRequired === "direction" && "Set direction"}
                      {nextRequired === "seats" && "Set seats"}
                    </button>
                  )}
                </div>
              </div>
              <div ref={startLiveButtonRef}>
                <Button
                  variant="primary"
                  className={`min-h-[48px] w-full rounded-[18px] px-4 text-sm font-semibold transition-all disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none ${
                    startIsActive
                      ? "ring-1 ring-[var(--color-accent)]/35 shadow-[0_16px_42px_rgba(255,45,120,0.16)]"
                      : ""
                  }`}
                  isLoading={isStarting}
                  disabled={!canStart}
                  onClick={handleStart}
                >
                  <Radio className="h-4 w-4" />
                  Start Live
                </Button>
              </div>
            </div>
          </div>

          {assignment ? (
            <StagePicker
              isOpen={isStagePickerOpen}
              onClose={() => setIsStagePickerOpen(false)}
              corridorId={assignment.corridor_id}
              onSelect={(stageId, stageName) => {
                setSelectedStartStage({
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
