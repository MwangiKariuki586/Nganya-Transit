import { useCallback, useEffect, useMemo, useState } from "react";
import { stageRepository } from "@/entities/stage/repository";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { nganyaRegistrationService } from "@/features/nganya-registration/services/nganya-registration-service";
import type { CrewDirectionValue } from "@/modules/crew/components/DirectionToggle";
import type { UseCrewLocationRuntimeReturn } from "@/modules/crew/hooks/useCrewLocationRuntime";
import type { ToastType } from "@/components/ui/Toast";
import {
  readCrewSetupDraft,
  writeCrewSetupDraft,
} from "@/modules/crew/lib/storage";
import { clampSeats, detectNearestStage, getGpsQuality } from "./crew-live-domain";
import type {
  NetworkStateLocal,
  PermissionStateLocal,
  StageOption,
  StartStageChoice,
} from "./crew-live-types";

// ─── Readiness → legacy PermissionStateLocal bridge ──────────────────────────
// The rest of the setup UI (CrewReadinessCard, PermissionBanner, etc.) still
// uses the four-value PermissionStateLocal type. We map the richer readiness
// state down to it here so no UI components need to change in this unit.
//
// IMPORTANT: 'checking' must NOT map to 'prompt'. While the Permissions API
// query is in-flight the state is unknown — treating it as 'prompt' causes
// the "Enable location" UI to flash on every mount even when permission is
// already granted. Map it to 'granted' optimistically so the UI stays neutral
// until we know for certain that permission is missing.

function toPermissionStateLocal(
  readiness: UseCrewLocationRuntimeReturn["readiness"],
): PermissionStateLocal {
  switch (readiness) {
    case "granted":
      return "granted";
    case "denied":
    case "blocked":
      return "denied";
    case "unavailable":
      return "unsupported";
    case "checking":
      // Unknown yet — treat as granted so the UI doesn't flash "Enable location".
      // If the Permissions API resolves to prompt_required, the state will update.
      return "granted";
    default:
      // prompt_required
      return "prompt";
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCrewLiveReadiness(
  assignment: any,
  bootstrapRequest: any,
  addToast: (msg: string, type: ToastType) => void,
  locationRuntime: UseCrewLocationRuntimeReturn,
) {
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
  const [networkStatus, setNetworkStatus] = useState<NetworkStateLocal>(
    typeof navigator === "undefined" || navigator.onLine ? "healthy" : "offline",
  );
  const [networkMessage, setNetworkMessage] = useState<string | null>(null);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [selectedStartStage, setSelectedStartStage] =
    useState<StartStageChoice | null>(null);
  const [showAssignmentHelp, setShowAssignmentHelp] = useState(false);
  const [isAssignmentExpanded, setIsAssignmentExpanded] = useState(false);

  // Derive legacy permission state from the runtime readiness
  const permissionStatus = toPermissionStateLocal(locationRuntime.readiness);

  // Derive coords shape expected by the rest of the setup UI
  const coords = locationRuntime.latestPosition
    ? {
        lat: locationRuntime.latestPosition.lat,
        lng: locationRuntime.latestPosition.lng,
        accuracy: locationRuntime.latestPosition.accuracy,
      }
    : null;

  // Track when we last got a fix (for the GPS quality indicator)
  const [lastFixAt, setLastFixAt] = useState<string | null>(null);
  useEffect(() => {
    if (locationRuntime.latestPosition) {
      setLastFixAt(new Date().toISOString());
    }
  }, [locationRuntime.latestPosition]);

  // Load registration request + history
  useEffect(() => {
    let active = true;
    Promise.all([
      crewLiveService.listHistory(1),
      bootstrapRequest
        ? nganyaRegistrationService.listMyRequests({ limit: 1 })
        : Promise.resolve([]),
    ])
      .then(([history, requests]) => {
        if (!active) return;
        setLastLiveAt(history?.[0]?.ended_at || history?.[0]?.started_at || null);
        setRegistrationRequest((requests as any[])?.[0] || null);
        setShowAssignmentHelp(false);
      })
      .catch((err: any) => {
        if (!active) return;
        addToast(err?.message || "Failed to load your assigned nganya.", "error");
      });
    return () => { active = false; };
  }, [bootstrapRequest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load corridor stages
  useEffect(() => {
    if (!assignment?.corridor_id) { setStages([]); return; }
    let active = true;
    stageRepository.listByCorridor(assignment.corridor_id)
      .then((data) => { if (active) setStages((data || []) as StageOption[]); })
      .catch(() => { if (active) setStages([]); });
    return () => { active = false; };
  }, [assignment?.corridor_id]);

  // Online/offline listener
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const handleOnline = () => { setNetworkStatus("healthy"); setNetworkMessage(null); };
    const handleOffline = () => { setNetworkStatus("offline"); setNetworkMessage("Offline. Reconnect before starting Live."); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Persist draft
  useEffect(() => {
    if (!assignment) return;
    writeCrewSetupDraft({ direction, seatsLeft, seatsConfirmed: hasConfirmedSeats });
  }, [assignment, direction, seatsLeft, hasConfirmedSeats]);

  // Auto-detect nearest stage from latest position
  const autoDetectedStage = useMemo(
    () => detectNearestStage(stages, coords),
    [coords, stages],
  );

  useEffect(() => {
    if (!autoDetectedStage) return;
    setSelectedStartStage((current) => {
      if (current?.source === "manual") return current;
      if (current?.id === autoDetectedStage.id && current?.source === "auto") return current;
      return autoDetectedStage;
    });
  }, [autoDetectedStage]);

  const locationGranted = permissionStatus === "granted";
  const directionSelected = Boolean(direction);
  const seatsSet = hasConfirmedSeats;
  const assignmentReady = Boolean(assignment?.nganya_id);

  const nextRequired = !locationGranted
    ? "location"
    : !directionSelected ? "direction"
    : !seatsSet ? "seats"
    : "start";

  const gpsQuality = getGpsQuality(coords?.accuracy ?? null);

  // Location action: delegate to the runtime
  const handleLocationAction = useCallback(() => {
    locationRuntime.requestPermission().catch((err: any) => {
      addToast(err?.message || "Location permission is required to go Live.", "error");
    });
  }, [locationRuntime, addToast]);

  return {
    registrationRequest,
    lastLiveAt,
    direction, setDirection,
    seatsLeft, setSeatsLeft,
    hasConfirmedSeats, setHasConfirmedSeats,
    permissionStatus,
    coords,
    lastFixAt,
    networkStatus, setNetworkStatus,
    networkMessage, setNetworkMessage,
    stages,
    selectedStartStage, setSelectedStartStage,
    showAssignmentHelp, setShowAssignmentHelp,
    isAssignmentExpanded, setIsAssignmentExpanded,
    // Expose captureLocation as a thin wrapper over requestPermission so
    // CrewLiveSetupScreen.handleStart can still call it for the initial fix.
    captureLocation: locationRuntime.requestPermission,
    handleLocationAction,
    assignmentReady,
    locationGranted,
    directionSelected,
    seatsSet,
    nextRequired,
    gpsQuality,
    isReadyToStart: assignmentReady && nextRequired === "start",
  };
}
