import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stageRepository } from "@/entities/stage/repository";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { nganyaRegistrationService } from "@/features/nganya-registration/services/nganya-registration-service";
import type { CrewDirectionValue } from "@/modules/crew/components/DirectionToggle";
import {
  readCrewSetupDraft,
  writeCrewSetupDraft,
} from "@/modules/crew/lib/storage";
import { clampSeats, detectNearestStage, getGpsQuality } from "./crew-live-domain";
import type {
  Coords,
  NetworkStateLocal,
  PermissionStateLocal,
  StageOption,
  StartStageChoice,
} from "./crew-live-types";

export function useCrewLiveReadiness(
  assignment: any,
  bootstrapRequest: any,
  addToast: (msg: string, type: string) => void,
) {
  const permissionWatcherRef = useRef<PermissionStatus | null>(null);

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
    typeof navigator === "undefined" || navigator.onLine ? "healthy" : "offline",
  );
  const [networkMessage, setNetworkMessage] = useState<string | null>(null);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [selectedStartStage, setSelectedStartStage] =
    useState<StartStageChoice | null>(null);
  const [showAssignmentHelp, setShowAssignmentHelp] = useState(false);
  const [isAssignmentExpanded, setIsAssignmentExpanded] = useState(false);

  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermissionStatus("unsupported");
      throw new Error("This browser does not support geolocation.");
    }

    // Bypass navigator.permissions.query — some mobile browsers falsely
    // report "denied" or suppress the native prompt.
    return new Promise<Coords>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        setPermissionStatus("prompt");
        reject(new Error("Location request timed out. Please ensure location is enabled and try again."));
      }, 15000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const nextCoords: Coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
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
              errorMessage =
                typeof window !== "undefined" && window.isSecureContext === false
                  ? "Location requires a secure connection. Please use HTTPS or localhost."
                  : "Location permission denied. Please enable location in your browser settings or app settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable. Please check your device's location services.";
              break;
            case error.TIMEOUT:
              setPermissionStatus("prompt");
              errorMessage = "Location request timed out. Please ensure location is enabled and try again.";
              break;
            default:
              setPermissionStatus("prompt");
              errorMessage = "An unknown error occurred while getting location.";
              break;
          }
          reject(new Error(errorMessage));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 },
      );
    });
  }, []);

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
  }, [bootstrapRequest?.id]);

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
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  // Permission watcher
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.geolocation) { setPermissionStatus("unsupported"); return; }
    if (!("permissions" in navigator) || !navigator.permissions?.query) { setPermissionStatus("prompt"); return; }

    let active = true;
    navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
      if (!active) return;
      permissionWatcherRef.current = status;
      const next = status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
      setPermissionStatus(next);
      if (next === "granted") void captureLocation().catch(() => null);
      status.onchange = () => {
        const updated = status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
        setPermissionStatus(updated);
        if (updated === "granted") void captureLocation().catch(() => null);
      };
    }).catch(() => { setPermissionStatus("prompt"); });

    return () => {
      active = false;
      if (permissionWatcherRef.current) permissionWatcherRef.current.onchange = null;
    };
  }, [captureLocation]);

  // Persist draft
  useEffect(() => {
    if (!assignment) return;
    writeCrewSetupDraft({ direction, seatsLeft, seatsConfirmed: hasConfirmedSeats });
  }, [assignment, direction, seatsLeft, hasConfirmedSeats]);

  // Auto-detect nearest stage
  const autoDetectedStage = useMemo(() => detectNearestStage(stages, coords), [coords, stages]);

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

  const handleLocationAction = useCallback(() => {
    void captureLocation().catch((err: any) => {
      addToast(err?.message || "Location permission is required to go Live.", "error");
    });
  }, [addToast, captureLocation]);

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
    captureLocation,
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
