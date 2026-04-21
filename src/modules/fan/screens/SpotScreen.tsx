import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  ChevronLeft,
  X,
  ImagePlus,
  MapPin,
  Navigation,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getUserMessage, toAppError } from "@/shared/errors/app-error";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { LoadingButton } from "@/components/ui/loading";
import { ListSkeleton } from "@/components/ui/loading";
import { ResponsiveNganyaImage } from "@/components/ui/ResponsiveNganyaImage";
import { useToast } from "@/components/ui/ToastContainer";
import { formatRelativeTime } from "@/lib/formatters";
import { postSighting } from "@/lib/queries/sightings";
import { supabase } from "@/lib/supabase";
import { useGeolocation } from "@/modules/crew/hooks/useGeolocation";
import type { SpotRouteData } from "@/modules/fan/services/route-data";

type SpotStep = "where" | "which" | "evidence" | "confirm";
type SignalQuality = "HIGH" | "MEDIUM" | "LOW";

interface PlannerPlace {
  id: string;
  name: string;
  corridor_id?: string;
}

interface CorridorSuggestion {
  corridorId: string | null;
  corridorName: string | null;
  source: "planner" | "location" | null;
}

interface StageMatch {
  id: string;
  name: string;
  distance_m: number;
}

interface SpotDraft {
  corridorId: string | null;
  direction: string | null;
  nganyaId: string | null;
  note: string;
  evidenceTags: string[];
  photoName: string | null;
}

interface QualitySummary {
  level: SignalQuality;
  score: number;
  reasons: string[];
  factors: Array<{
    label: string;
    passed: boolean;
    detail: string;
  }>;
}

const STEP_ORDER: SpotStep[] = ["where", "which", "evidence", "confirm"];
const CONTEXT_TAGS = [
  "Loud sound",
  "Crowded",
  "Empty",
  "At stage",
  "Moving fast",
  "Traffic",
  "Parked",
  "Queueing",
] as const;

function readStoredJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getPlannerSuggestion(corridors: any[]): CorridorSuggestion {
  const place = readStoredJson<PlannerPlace>("whereto_toPlace");
  if (!place) return { corridorId: null, corridorName: null, source: null };

  const corridorId = place.corridor_id || place.id;
  const corridor = corridors.find((item) => item.id === corridorId);

  return {
    corridorId: corridor?.id || null,
    corridorName: corridor?.name || place.name || null,
    source: corridor ? "planner" : null,
  };
}

function getDirectionOptions(corridorName: string | null) {
  const terminal = corridorName || "Terminal";
  return [
    { value: "TOWN", label: "-> Town" },
    { value: "TERMINAL", label: `-> ${terminal}` },
  ];
}

function getSignalCue(candidate: any) {
  if (candidate.liveCue) return "Live on this route";
  if (candidate.lastSeenAt)
    return `Seen ${formatRelativeTime(candidate.lastSeenAt)}`;
  if (candidate.isFollowed) return "You follow this build";
  return `Popular on this route`;
}

function formatDistance(distance: number | null | undefined) {
  if (!Number.isFinite(distance ?? NaN)) return null;
  if ((distance || 0) < 1000) return `${Math.round(distance || 0)}m`;
  return `${((distance || 0) / 1000).toFixed(1)}km`;
}

function buildQualitySummary(params: {
  corridorName: string | null;
  direction: string | null;
  photoName: string | null;
  evidenceTags: string[];
  locationGranted: boolean;
  corridorFit: boolean;
  corridorDistance: number | null;
  corroborationMinutes: number | null;
  duplicatePenalty: boolean;
}): QualitySummary {
  const factors = [
    {
      label: "Route selected",
      passed: Boolean(params.corridorName),
      detail: params.corridorName || "Pick a route",
    },
    {
      label: "Direction set",
      passed: Boolean(params.direction),
      detail: params.direction
        ? "Structured route direction added"
        : "Choose a direction",
    },
    {
      label: "Live location on submit",
      passed: params.locationGranted,
      detail: params.locationGranted
        ? "Real device location available"
        : "Location still pending",
    },
    {
      label: "Location fits route",
      passed: params.corridorFit,
      detail: params.corridorFit
        ? params.corridorDistance !== null
          ? `Within ${formatDistance(params.corridorDistance) || "route fit"}`
          : "Route fit verified"
        : "Fit still uncertain",
    },
    {
      label: "Photo evidence",
      passed: Boolean(params.photoName),
      detail: params.photoName ? "Photo attached" : "No photo attached",
    },
    {
      label: "Context added",
      passed: params.evidenceTags.length > 0,
      detail:
        params.evidenceTags.length > 0
          ? `${params.evidenceTags.length} context tag${params.evidenceTags.length === 1 ? "" : "s"}`
          : "No context tags yet",
    },
    {
      label: "Recent corroboration",
      passed:
        params.corroborationMinutes !== null &&
        params.corroborationMinutes <= 10,
      detail:
        params.corroborationMinutes !== null
          ? `Another fan spotted it ${params.corroborationMinutes}m ago`
          : "No recent corroboration",
    },
  ];

  let score = 0;
  if (params.locationGranted) score += 30;
  if (params.corridorFit) score += 25;
  if (params.direction) score += 10;
  if (params.photoName) score += 15;
  if (params.evidenceTags.length > 0) score += 10;
  if (params.corroborationMinutes !== null && params.corroborationMinutes <= 10)
    score += 15;
  if (params.duplicatePenalty) score -= 25;

  const reasons: string[] = [];
  if (params.locationGranted && params.corridorFit)
    reasons.push("Verified route fit");
  if (params.direction) reasons.push("Direction set");
  if (params.photoName) reasons.push("Photo evidence");
  if (params.corroborationMinutes !== null && params.corroborationMinutes <= 10)
    reasons.push("Recent corroboration");
  if (params.duplicatePenalty) reasons.push("Repeat spotting penalty");

  let level: SignalQuality = "LOW";
  if (
    params.locationGranted &&
    params.corridorFit &&
    params.direction &&
    (Boolean(params.photoName) ||
      (params.corroborationMinutes !== null &&
        params.corroborationMinutes <= 10)) &&
    !params.duplicatePenalty
  ) {
    level = "HIGH";
  } else if (params.locationGranted && params.corridorFit && params.direction) {
    level = "MEDIUM";
  }

  return { level, score, reasons, factors };
}

async function findClosestStagesForCorridor(
  corridorId: string,
  lat: number,
  lng: number,
) {
  const { data, error } = await (supabase.rpc as any)("closest_stages", {
    p_corridor_id: corridorId,
    p_lat: lat,
    p_lng: lng,
    p_limit: 3,
    p_max_meters: 5000,
  });

  if (error) throw error;
  return (data || []) as StageMatch[];
}

function getRouteFitMessage(distance: number | null) {
  if (distance === null) return "Route fit will be checked on submit";
  if (distance <= 350)
    return `Strong route fit - nearest stage ${formatDistance(distance)} away`;
  if (distance <= 1200)
    return `Usable route fit - nearest stage ${formatDistance(distance)} away`;
  return `Route fit uncertain - nearest stage ${formatDistance(distance)} away`;
}

function clearPhotoSelection(params: {
  selectedPhotoPreviewUrl: string | null;
  setSelectedPhotoName: Dispatch<SetStateAction<string | null>>;
  setSelectedPhotoPreviewUrl: Dispatch<SetStateAction<string | null>>;
  setDraft: Dispatch<SetStateAction<SpotDraft>>;
}) {
  if (params.selectedPhotoPreviewUrl) {
    URL.revokeObjectURL(params.selectedPhotoPreviewUrl);
  }

  params.setSelectedPhotoName(null);
  params.setSelectedPhotoPreviewUrl(null);
  params.setDraft((current) => ({
    ...current,
    photoName: null,
  }));
}

interface SpotScreenProps {
  data: SpotRouteData;
}

export default function SpotScreen({ data }: SpotScreenProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const {
    nganyas,
    corridors,
    isAuthenticated,
    liveNganyas,
    recentSightings,
    mySightings,
    followedIds,
  } = data;

  const [step, setStep] = useState<SpotStep>("where");
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<SpotDraft>({
    corridorId: null,
    direction: null,
    nganyaId: null,
    note: "",
    evidenceTags: [],
    photoName: null,
  });
  const [locationSuggestion, setLocationSuggestion] =
    useState<CorridorSuggestion>({
      corridorId: null,
      corridorName: null,
      source: null,
    });
  const [isDetectingCorridor, setIsDetectingCorridor] = useState(false);
  const [routeFitDistance, setRouteFitDistance] = useState<number | null>(null);
  const [routeFitStageId, setRouteFitStageId] = useState<string | null>(null);
  const [routeFitStageName, setRouteFitStageName] = useState<string | null>(
    null,
  );
  const [routeFitChecked, setRouteFitChecked] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [selectedPhotoName, setSelectedPhotoName] = useState<string | null>(
    null,
  );
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<
    string | null
  >(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [corridorWarning, setCorridorWarning] = useState<string | null>(null);
  const [isValidatingRoute, setIsValidatingRoute] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorridorBlocking, setIsCorridorBlocking] = useState(false);
  const [submittedQuality, setSubmittedQuality] =
    useState<QualitySummary | null>(null);
  const [submittedNganyaName, setSubmittedNganyaName] = useState<string | null>(
    null,
  );
  const [submittedCorroborationMinutes, setSubmittedCorroborationMinutes] =
    useState<number | null>(null);

  const geolocation = useGeolocation({
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 3000,
  });

  useEffect(() => {
    const plannerSuggestion = getPlannerSuggestion(corridors);
    if (plannerSuggestion.corridorId) {
      setLocationSuggestion(plannerSuggestion);
      setDraft((current) => ({
        ...current,
        corridorId: current.corridorId || plannerSuggestion.corridorId,
      }));
    }
  }, [corridors]);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl);
      }
    };
  }, [selectedPhotoPreviewUrl]);

  useEffect(() => {
    setRouteFitDistance(null);
    setRouteFitStageId(null);
    setRouteFitStageName(null);
    setRouteFitChecked(false);
    setIsCorridorBlocking(false);
    setCorridorWarning(null);
  }, [draft.corridorId]);

  const corridorById = useMemo(
    () => new Map(corridors.map((corridor: any) => [corridor.id, corridor])),
    [corridors],
  );

  const liveByNganyaId = useMemo(
    () =>
      new Map<string, any>(
        (liveNganyas || []).map((row: any) => [row.nganya_id, row]),
      ),
    [liveNganyas],
  );

  const recentByNganyaId = useMemo(() => {
    const next = new Map<string, any>();
    for (const sighting of recentSightings || []) {
      if (!next.has(sighting.nganya_id)) {
        next.set(sighting.nganya_id, sighting);
      }
    }
    return next;
  }, [recentSightings]);

  const selectedCorridor = draft.corridorId
    ? corridorById.get(draft.corridorId) || null
    : null;

  const selectedNganyaData = draft.nganyaId
    ? nganyas.find((nganya: any) => nganya.id === draft.nganyaId) || null
    : null;

  const corroboratingSighting = useMemo(() => {
    if (!draft.nganyaId) return null;
    return (
      recentSightings.find(
        (sighting: any) => sighting.nganya_id === draft.nganyaId,
      ) || null
    );
  }, [draft.nganyaId, recentSightings]);

  const corroborationMinutes = useMemo(() => {
    if (!corroboratingSighting?.created_at) return null;
    return Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(corroboratingSighting.created_at).getTime()) /
          60000,
      ),
    );
  }, [corroboratingSighting]);

  const duplicateWindowSighting = useMemo(() => {
    if (!draft.nganyaId) return null;

    return (
      (mySightings || []).find((sighting: any) => {
        if (sighting.nganya_id !== draft.nganyaId) return false;
        const age = Date.now() - new Date(sighting.created_at).getTime();
        return age <= 5 * 60 * 1000;
      }) || null
    );
  }, [draft.nganyaId, mySightings]);

  const qualitySummary = useMemo(
    () =>
      buildQualitySummary({
        corridorName: selectedCorridor?.name || null,
        direction: draft.direction,
        photoName: selectedPhotoName,
        evidenceTags: draft.evidenceTags,
        locationGranted:
          geolocation.permissionStatus === "granted" || routeFitChecked,
        corridorFit: routeFitChecked ? !isCorridorBlocking : false,
        corridorDistance: routeFitDistance,
        corroborationMinutes,
        duplicatePenalty: Boolean(duplicateWindowSighting),
      }),
    [
      selectedCorridor?.name,
      draft.direction,
      selectedPhotoName,
      draft.evidenceTags,
      geolocation.permissionStatus,
      routeFitChecked,
      isCorridorBlocking,
      routeFitDistance,
      corroborationMinutes,
      duplicateWindowSighting,
    ],
  );

  const spotCandidates = useMemo(() => {
    const corridorId = draft.corridorId;
    const query = searchQuery.trim().toLowerCase();
    const uniqueNganyas = Array.from(
      new Map(
        (nganyas || []).map((nganya: any) => [nganya.id, nganya]),
      ).values(),
    );

    const scoped = uniqueNganyas
      .filter((nganya: any) => !corridorId || nganya.corridor_id === corridorId)
      .map((nganya: any) => {
        const liveCue = liveByNganyaId.get(nganya.id) || null;
        const recentCue = recentByNganyaId.get(nganya.id) || null;
        const corridorName = nganya.corridors?.name || "Unknown route";
        const isFollowed = followedIds.has(nganya.id);
        const textScore = query
          ? nganya.name?.toLowerCase().includes(query)
            ? 1000
            : corridorName.toLowerCase().includes(query)
              ? 400
              : 0
          : 0;
        const activityScore = liveCue ? 3000 : recentCue ? 1800 : 0;
        const followScore = isFollowed ? 800 : 0;
        return {
          ...nganya,
          corridorName,
          liveCue,
          recentCue,
          isFollowed,
          lastSeenAt: liveCue?.last_ping_at || recentCue?.created_at || null,
          rank: activityScore + followScore + textScore,
        };
      })
      .filter(
        (candidate: any) =>
          !query ||
          candidate.rank > 0 ||
          candidate.name?.toLowerCase().includes(query),
      );

    return scoped.sort((left: any, right: any) => right.rank - left.rank);
  }, [
    draft.corridorId,
    nganyas,
    searchQuery,
    liveByNganyaId,
    recentByNganyaId,
    followedIds,
  ]);

  const topSuggestions = useMemo(
    () =>
      spotCandidates
        .filter((candidate: any) => candidate.liveCue || candidate.recentCue)
        .slice(0, 3),
    [spotCandidates],
  );

  const topSuggestionIds = useMemo(
    () => new Set(topSuggestions.map((candidate: any) => candidate.id)),
    [topSuggestions],
  );

  const remainingSpotCandidates = useMemo(
    () =>
      spotCandidates.filter(
        (candidate: any) => !topSuggestionIds.has(candidate.id),
      ),
    [spotCandidates, topSuggestionIds],
  );

  const stepIndex = STEP_ORDER.indexOf(step);
  const directionOptions = getDirectionOptions(selectedCorridor?.name || null);

  const applyLocationSuggestion = async () => {
    if (!draft.corridorId && locationSuggestion.corridorId) {
      setDraft((current) => ({
        ...current,
        corridorId: locationSuggestion.corridorId,
      }));
      return;
    }

    setIsDetectingCorridor(true);
    try {
      const coords = await geolocation.getCurrentPosition();
      const candidates = await Promise.all(
        corridors.map(async (corridor: any) => {
          const nearest = await findClosestStagesForCorridor(
            corridor.id,
            coords.lat,
            coords.lng,
          );
          return { corridor, nearest: nearest[0] || null };
        }),
      );

      const best = candidates
        .filter((item) => item.nearest)
        .sort(
          (left, right) =>
            (left.nearest?.distance_m || Infinity) -
            (right.nearest?.distance_m || Infinity),
        )[0];

      if (best?.corridor) {
        setLocationSuggestion({
          corridorId: best.corridor.id,
          corridorName: best.corridor.name,
          source: "location",
        });
        setDraft((current) => ({
          ...current,
          corridorId: current.corridorId || best.corridor.id,
        }));
      }
    } catch (error: any) {
      addToast(getUserMessage(toAppError(error)), "error");
    } finally {
      setIsDetectingCorridor(false);
    }
  };

  const goBack = () => {
    if (step === "which") setStep("where");
    else if (step === "evidence") setStep("which");
    else if (step === "confirm") setStep("evidence");
  };

  const showFlowError = (message: string) => {
    setSubmitError(message);
    addToast(message, "error");
  };

  const continueFromWhich = () => {
    if (!draft.nganyaId) return;
    setStep("evidence");
  };

  const continueFromEvidence = () => {
    if (!draft.nganyaId || !draft.corridorId || !draft.direction) return;
    setStep("confirm");
  };

  const toggleContextTag = (tag: string) => {
    setDraft((current) => ({
      ...current,
      evidenceTags: current.evidenceTags.includes(tag)
        ? current.evidenceTags.filter((item) => item !== tag)
        : [...current.evidenceTags, tag].slice(0, 4),
    }));
  };

  const verifyCorridorFit = async (
    corridorId: string,
    lat: number,
    lng: number,
  ) => {
    const nearestStages = await findClosestStagesForCorridor(
      corridorId,
      lat,
      lng,
    );
    const nearest = nearestStages[0] || null;
    const distance = nearest?.distance_m ?? null;

    setRouteFitDistance(distance);
    setRouteFitStageId(nearest?.id || null);
    setRouteFitStageName(nearest?.name || null);
    setRouteFitChecked(true);

    if (distance === null || distance > 1500) {
      setIsCorridorBlocking(true);
      const message =
        "Your location does not seem to match this route. Change route or cancel.";
      setCorridorWarning(message);
      addToast(message, "error");
      return { valid: false, nearest };
    }

    setIsCorridorBlocking(false);
    setCorridorWarning(null);
    return { valid: true, nearest };
  };

  const continueFromWhere = async () => {
    if (!draft.corridorId || !draft.direction) return;

    setIsValidatingRoute(true);
    setSubmitError(null);

    try {
      const coords = await geolocation.getCurrentPosition();
      const fit = await verifyCorridorFit(
        draft.corridorId,
        coords.lat,
        coords.lng,
      );

      if (!fit.valid) {
        return;
      }

      setStep("which");
    } catch (error: any) {
      const message =
        getUserMessage(toAppError(error)) ||
        "Allow live location so we can verify this route before you continue.";
      setCorridorWarning(message);
      addToast(message, "error");
    } finally {
      setIsValidatingRoute(false);
    }
  };

  const handleSubmit = async () => {
    if (!draft.nganyaId || !draft.corridorId || !draft.direction) return;
    if (!confirmationChecked) {
      showFlowError("Confirm that this sighting is accurate right now.");
      return;
    }
    if (duplicateWindowSighting) {
      showFlowError(
        "You already spotted this nganya a moment ago. Give it a few minutes before posting again.",
      );
      return;
    }
    if (!routeFitChecked || isCorridorBlocking) {
      showFlowError("Verify your route before you confirm this live signal.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!isAuthenticated) {
        navigate({ to: "/signin" });
        return;
      }

      const coords = await geolocation.getCurrentPosition();

      await postSighting({
        nganya_id: draft.nganyaId,
        corridor_id: draft.corridorId,
        stage_id: routeFitStageId,
        location: `POINT(${coords.lng} ${coords.lat})`,
        direction: draft.direction,
        note: [draft.evidenceTags.join(" - "), draft.note.trim()]
          .filter(Boolean)
          .join("\n"),
      });

      addToast(
        "Sighting posted. You just boosted this live signal.",
        "success",
      );
      setSubmittedNganyaName(selectedNganyaData?.name || null);
      setSubmittedQuality(qualitySummary);
      setSubmittedCorroborationMinutes(corroborationMinutes);
    } catch (error: any) {
      showFlowError(getUserMessage(toAppError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedQuality) {
    return (
      <div className="page-container flex min-h-[60vh] max-w-xl flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-green-soft)] animate-scale-in">
          <CheckCircle className="h-10 w-10 text-[var(--color-success)]" />
        </div>
        <h2 className="text-h2 text-[var(--color-text-primary)]">
          Sighting posted
        </h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          You just boosted this signal for{" "}
          <strong>{submittedNganyaName}</strong>.
        </p>
        <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 text-left">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            Signal quality: {submittedQuality.level}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {submittedQuality.reasons.join(" + ") ||
              "Fresh live verification posted"}
          </p>
          {submittedCorroborationMinutes !== null ? (
            <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
              Another fan had this sighting {submittedCorroborationMinutes}m
              ago.
            </p>
          ) : null}
        </div>
        <Button
          variant="primary"
          className="mt-6"
          onClick={() => navigate({ to: "/" })}
        >
          Back Home
        </Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container pt-8 pb-12 md:pt-12 md:pb-16">
        <EmptyState
          variant="no-following"
          title="Sign in to verify sightings"
          message="Live signals are tied to your account and real location at submit."
          actionLabel="Sign In"
          onAction={() => navigate({ to: "/signin" })}
        />
      </div>
    );
  }

  return (
    <div className="page-container mx-auto max-w-3xl pt-8 pb-10 md:pt-12 md:pb-16">
      <div className="mb-6 flex items-center gap-3">
        {step !== "where" && (
          <button
            onClick={goBack}
            className="rounded-full p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--glass-bg)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-h2">Spot a Nganya</h1>
          <p className="text-body-sm text-[var(--color-text-tertiary)]">
            {step === "where" && "Where did you see it?"}
            {step === "which" && "Which nganya was it?"}
            {step === "evidence" && "Add evidence"}
            {step === "confirm" && "Confirm signal"}
          </p>
        </div>
      </div>

      <div className="mb-8 flex gap-1.5">
        {STEP_ORDER.map((item, index) => (
          <div
            key={item}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index <= stepIndex
                ? "bg-[var(--color-accent)]"
                : "bg-[var(--glass-bg)]"
            }`}
          />
        ))}
      </div>

      {step === "where" && (
        <section className="space-y-5">
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <div className="flex items-start gap-3">
              <Navigation className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  We verify your route before you continue
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
                  Pick the route now. MATWANA checks it against your live device
                  location before you move on.
                </p>
              </div>
            </div>
          </div>

          {locationSuggestion.corridorId ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {locationSuggestion.source === "planner"
                      ? `Recent route suggests ${locationSuggestion.corridorName}`
                      : `We think you're on ${locationSuggestion.corridorName}`}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                    Confirm or switch before continuing.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      corridorId: locationSuggestion.corridorId,
                    }))
                  }
                >
                  Use it
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => void applyLocationSuggestion()}
              isLoading={isDetectingCorridor}
            >
              <MapPin className="h-4 w-4" />
              Suggest from location
            </Button>
          </div>

          {routeFitChecked && !isCorridorBlocking ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[rgba(34,197,94,0.08)] p-4 text-sm text-[var(--color-text-secondary)]">
              {getRouteFitMessage(routeFitDistance)}
            </div>
          ) : null}

          {corridorWarning ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/40 bg-[rgba(251,191,36,0.08)] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                <div className="text-sm text-[var(--color-text-secondary)]">
                  {corridorWarning}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {corridors.map((corridor: any) => {
              const selected = draft.corridorId === corridor.id;
              const suggested = locationSuggestion.corridorId === corridor.id;
              return (
                <button
                  key={corridor.id}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      corridorId: corridor.id,
                    }))
                  }
                  className={`rounded-[var(--radius-md)] border p-4 text-left transition-all ${
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--glass-border-hover)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {corridor.name}
                    </span>
                    {suggested ? (
                      <Chip label="Suggested" variant="route" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <div className="text-caption text-[var(--color-text-tertiary)]">
              Direction
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {directionOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  variant="route"
                  isActive={draft.direction === option.value}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      direction: option.value,
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <LoadingButton
            variant="primary"
            className="w-full"
            disabled={!draft.corridorId || !draft.direction}
            onClick={continueFromWhere}
            isLoading={isValidatingRoute}
            loadingLabel="Checking route..."
          >
            Continue
          </LoadingButton>
        </section>
      )}

      {step === "which" && (
        <section className="space-y-5">
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Search className="h-4 w-4 text-[var(--color-accent)]" />
              Candidates are filtered to{" "}
              {selectedCorridor?.name || "this route"} and ranked by live/recent
              route signal.
            </div>
          </div>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by nganya name..."
          />

          {topSuggestions.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                <Sparkles className="h-4 w-4 text-[var(--color-cyan)]" />
                {geolocation.permissionStatus === "granted"
                  ? "Recently spotted near you"
                  : "Likely on this route"}
              </div>
              <div className="space-y-2">
                {topSuggestions.map((candidate: any) => {
                  const selected = draft.nganyaId === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          nganyaId: candidate.id,
                        }))
                      }
                      className={`grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-all ${
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--glass-border-hover)]"
                      }`}
                    >
                      <ResponsiveNganyaImage
                        src={
                          candidate.nganya_media?.[0]?.media_url ||
                          "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80"
                        }
                        alt={candidate.name}
                        variant="compact"
                        className="h-14 w-14 rounded-[var(--radius-md)] object-cover"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                          {candidate.name}
                        </div>
                        <div className="truncate text-xs text-[var(--color-text-tertiary)]">
                          {candidate.corridorName}
                        </div>
                        <div className="truncate text-xs text-[var(--color-accent)]">
                          {getSignalCue(candidate)}
                        </div>
                      </div>
                      {selected ? (
                        <CheckCircle className="h-4 w-4 text-[var(--color-accent)]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {remainingSpotCandidates.length > 0 ? (
              remainingSpotCandidates.map((candidate: any) => {
                const selected = draft.nganyaId === candidate.id;
                return (
                  <button
                    key={candidate.id}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        nganyaId: candidate.id,
                      }))
                    }
                    className={`grid h-[84px] w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-all ${
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--glass-border-hover)]"
                    }`}
                  >
                    <ResponsiveNganyaImage
                      src={
                        candidate.nganya_media?.[0]?.media_url ||
                        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80"
                      }
                      alt={candidate.name}
                      variant="compact"
                      className="h-14 w-14 rounded-[var(--radius-md)] object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {candidate.name}
                      </div>
                      <div className="truncate text-xs text-[var(--color-text-tertiary)]">
                        {candidate.corridorName}
                      </div>
                      <div className="truncate text-xs text-[var(--color-accent)]">
                        {getSignalCue(candidate)}
                      </div>
                    </div>
                    {selected ? (
                      <CheckCircle className="h-4 w-4 text-[var(--color-accent)]" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--glass-border)] p-5 text-sm text-[var(--color-text-secondary)]">
                {topSuggestions.length > 0
                  ? "Top matches are already shown above."
                  : "No nganyas match this route and search. Try another name or switch route."}
              </div>
            )}
          </div>

          <LoadingButton
            variant="primary"
            className="w-full"
            disabled={!draft.nganyaId}
            onClick={continueFromWhich}
          >
            Continue
          </LoadingButton>
        </section>
      )}

      {step === "evidence" && (
        <section className="space-y-5">
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <div className="flex items-start gap-3">
              <Camera className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  Photos improve trust and visibility
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
                  Photo helps confirm build, livery, and route presence. It
                  stays optional so the flow stays quick.
                </p>
              </div>
            </div>
          </div>

          <label className="block cursor-pointer rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] p-4 transition-colors hover:border-[var(--glass-border-hover)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--glass-bg)]">
                  <ImagePlus className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {selectedPhotoName ? "Photo added" : "Add a photo"}
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--color-text-tertiary)]">
                    {selectedPhotoName
                      ? `${selectedPhotoName} stays local for now while uploads remain lightweight.`
                      : "Quick camera or upload evidence. Optional, but it strengthens the signal."}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                {selectedPhotoName ? "Change" : "Choose"}
              </span>
            </div>
            {selectedPhotoPreviewUrl ? (
              <div className="relative mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    clearPhotoSelection({
                      selectedPhotoPreviewUrl,
                      setSelectedPhotoName,
                      setSelectedPhotoPreviewUrl,
                      setDraft,
                    });
                  }}
                  className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[rgba(15,15,22,0.78)] text-[var(--color-text-primary)] backdrop-blur-md transition-colors hover:border-[var(--glass-border-hover)] hover:bg-[rgba(15,15,22,0.92)]"
                  aria-label="Remove selected image"
                >
                  <X className="h-4 w-4" />
                </button>
                <img
                  src={selectedPhotoPreviewUrl}
                  alt={selectedPhotoName || "Selected sighting preview"}
                  className="h-48 w-full object-cover md:h-64"
                />
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                const fileName = file?.name || null;
                if (selectedPhotoPreviewUrl) {
                  URL.revokeObjectURL(selectedPhotoPreviewUrl);
                }
                setSelectedPhotoName(fileName);
                setSelectedPhotoPreviewUrl(
                  file ? URL.createObjectURL(file) : null,
                );
                setDraft((current) => ({
                  ...current,
                  photoName: fileName,
                }));
              }}
            />
          </label>

          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              Quick context
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Pick what riders should know right now.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CONTEXT_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  variant="route"
                  isActive={draft.evidenceTags.includes(tag)}
                  onClick={() => toggleContextTag(tag)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <label
              htmlFor="spot-note"
              className="text-sm font-medium text-[var(--color-text-primary)]"
            >
              What stood out?
            </label>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              Stage, crowd, sound, direction, or timing. Keep it short and
              useful.
            </p>
            <textarea
              id="spot-note"
              value={draft.note}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  note: event.target.value.slice(0, 180),
                }))
              }
              rows={4}
              placeholder="E.g. Queueing at Roysambu, heading to town..."
              className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">
              Signal preview
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip label="Route fit already checked" variant="status" />
              <Chip
                label={draft.photoName ? "Photo: added" : "Photo: not added"}
                variant="route"
              />
              <Chip
                label={
                  draft.evidenceTags.length > 0
                    ? `Context: ${draft.evidenceTags.length} tags`
                    : "Context: none yet"
                }
                variant="route"
              />
            </div>
          </div>

          <LoadingButton
            variant="primary"
            className="w-full"
            onClick={continueFromEvidence}
          >
            Review signal
          </LoadingButton>
        </section>
      )}

      {step === "confirm" && (
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
                <div className="flex items-start gap-4">
                  <ResponsiveNganyaImage
                    src={
                      selectedNganyaData?.nganya_media?.[0]?.media_url ||
                      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80"
                    }
                    alt={selectedNganyaData?.name || "Selected nganya"}
                    variant="compact"
                    className="h-16 w-16 rounded-[var(--radius-lg)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold text-[var(--color-text-primary)]">
                      {selectedNganyaData?.name || "Nganya pending"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCorridor ? (
                        <Chip label={selectedCorridor.name} variant="route" />
                      ) : null}
                      {draft.direction ? (
                        <Chip
                          label={
                            draft.direction === "TOWN"
                              ? "-> Town"
                              : `-> ${selectedCorridor?.name || "Terminal"}`
                          }
                          variant="status"
                        />
                      ) : null}
                      <Chip label="Live location on submit" variant="route" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="text-caption text-[var(--color-text-tertiary)]">
                    Photo
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                    {draft.photoName ? "Added" : "Not added"}
                  </div>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="text-caption text-[var(--color-text-tertiary)]">
                    Timing freshness
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                    Posting now
                  </div>
                </div>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Context
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.evidenceTags.length > 0 ? (
                    draft.evidenceTags.map((tag) => (
                      <Chip key={tag} label={tag} variant="route" />
                    ))
                  ) : (
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      No quick context added.
                    </span>
                  )}
                </div>
                {draft.note.trim() ? (
                  <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                    {draft.note.trim()}
                  </p>
                ) : null}
              </div>

              {corroborationMinutes !== null ? (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-cyan)]/20 bg-[rgba(34,211,238,0.08)] p-4 text-sm text-[var(--color-text-secondary)]">
                  Last spotted {corroborationMinutes}m ago by another fan.
                </div>
              ) : null}

              {duplicateWindowSighting ? (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/40 bg-[rgba(251,191,36,0.08)] p-4 text-sm text-[var(--color-text-secondary)]">
                  You already posted this nganya recently. Wait a few minutes
                  before sending another confirmation.
                </div>
              ) : null}

              {corridorWarning ? (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/40 bg-[rgba(251,191,36,0.08)] p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                    <div className="text-sm text-[var(--color-text-secondary)]">
                      {corridorWarning}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
                  Signal quality: {qualitySummary.level}
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {qualitySummary.reasons.join(" + ") ||
                    "Add route fit, photo, or corroboration to raise trust."}
                </p>
                <div className="mt-4 space-y-3">
                  {qualitySummary.factors.map((factor) => (
                    <div
                      key={factor.label}
                      className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[var(--color-text-primary)]">
                          {factor.label}
                        </span>
                        {factor.passed ? (
                          <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                        ) : (
                          <Radio className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                        {factor.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Final confirmation
                </div>
                <label className="mt-3 flex items-start gap-3 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={confirmationChecked}
                    onChange={(event) =>
                      setConfirmationChecked(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-[var(--glass-border)] bg-transparent text-[var(--color-accent)]"
                  />
                  <span>I confirm this sighting is accurate right now.</span>
                </label>
                {routeFitChecked ? (
                  <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
                    {routeFitDistance !== null
                      ? `Closest route fit: ${routeFitStageName || "Nearby stage"} at ${formatDistance(routeFitDistance)}.`
                      : "Route fit already verified."}
                  </p>
                ) : null}
                {submitError ? (
                  <p className="mt-3 text-sm text-red-300">{submitError}</p>
                ) : null}
                <LoadingButton
                  variant="primary"
                  className="mt-4 w-full"
                  isLoading={isSubmitting}
                  loadingLabel="Verifying live signal..."
                  onClick={handleSubmit}
                  disabled={
                    !confirmationChecked ||
                    duplicateWindowSighting ||
                    isCorridorBlocking
                  }
                >
                  Confirm & Share Live
                </LoadingButton>
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

export function SpotScreenSkeleton() {
  return (
    <div className="page-container mx-auto max-w-3xl pt-8 pb-10 md:pt-12 md:pb-16">
      <div className="mb-6">
        <div className="h-8 w-48 rounded bg-[var(--glass-bg)]" />
        <div className="mt-3 h-4 w-40 rounded bg-[rgba(255,255,255,0.08)]" />
      </div>
      <div className="mb-8 flex gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-1 flex-1 rounded-full bg-[var(--glass-bg)]"
          />
        ))}
      </div>
      <div className="space-y-4">
        <CardSkeleton />
        <ListSkeleton items={4} />
      </div>
    </div>
  );
}
