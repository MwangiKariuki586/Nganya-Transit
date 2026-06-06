import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getUserMessage, toAppError } from "@/shared/errors/app-error";
import { useToast } from "@/components/ui/ToastContainer";
import { postSighting } from "@/lib/queries/sightings";
import { useGeolocation } from "@/hooks/useGeolocation";
import type {
  FanCorridorRecord,
  FanLiveNganyaRecord,
  FanNganyaRecord,
  FanRecentSightingRecord,
} from "@/modules/fan/lib/fan-data";
import type { SpotRouteData } from "@/modules/fan/services/route-data";
import type {
  SpotStep,
  CorridorSuggestion,
  SpotDraft,
  QualitySummary,
  SpotCandidate,
} from "./spot-types";
import {
  getPlannerSuggestion,
  getDirectionOptions,
  buildQualitySummary,
  findClosestStagesForCorridor,
} from "./spot-domain";

export function useSpotFlow(data: SpotRouteData) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { nganyas, corridors, isAuthenticated, liveNganyas, recentSightings, mySightings, followedIds } = data;

  const [step, setStep] = useState<SpotStep>("where");
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<SpotDraft>({ corridorId: null, direction: null, nganyaId: null, note: "", evidenceTags: [], photoName: null });
  const [locationSuggestion, setLocationSuggestion] = useState<CorridorSuggestion>({ corridorId: null, corridorName: null, source: null });
  const [isDetectingCorridor, setIsDetectingCorridor] = useState(false);
  const [routeFitDistance, setRouteFitDistance] = useState<number | null>(null);
  const [routeFitStageId, setRouteFitStageId] = useState<string | null>(null);
  const [routeFitChecked, setRouteFitChecked] = useState(false);
  const [confirmationChecked] = useState(true);
  const [selectedPhotoName, setSelectedPhotoName] = useState<string | null>(null);
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [corridorWarning, setCorridorWarning] = useState<string | null>(null);
  const [isValidatingRoute, setIsValidatingRoute] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorridorBlocking, setIsCorridorBlocking] = useState(false);
  const [submittedQuality, setSubmittedQuality] = useState<QualitySummary | null>(null);
  const [submittedNganyaName, setSubmittedNganyaName] = useState<string | null>(null);
  const [submittedCorroborationMinutes, setSubmittedCorroborationMinutes] = useState<number | null>(null);

  const geolocation = useGeolocation({ enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 });

  useEffect(() => {
    const s = getPlannerSuggestion(corridors);
    if (s.corridorId) { setLocationSuggestion(s); setDraft((c) => ({ ...c, corridorId: c.corridorId || s.corridorId })); }
  }, [corridors]);

  useEffect(() => { return () => { if (selectedPhotoPreviewUrl) URL.revokeObjectURL(selectedPhotoPreviewUrl); }; }, [selectedPhotoPreviewUrl]);

  useEffect(() => {
    setRouteFitDistance(null); setRouteFitStageId(null);
    setRouteFitChecked(false); setIsCorridorBlocking(false); setCorridorWarning(null);
  }, [draft.corridorId]);

  const corridorById = useMemo(
    () => new Map(corridors.map((c) => [c.id, c] as const)),
    [corridors],
  );
  const liveByNganyaId = useMemo(
    () =>
      new Map<string, FanLiveNganyaRecord>(
        (liveNganyas || [])
          .filter((row): row is FanLiveNganyaRecord & { nganya_id: string } => Boolean(row.nganya_id))
          .map((row) => [row.nganya_id, row]),
      ),
    [liveNganyas],
  );
  const recentByNganyaId = useMemo(() => {
    const m = new Map<string, FanRecentSightingRecord>();
    for (const s of recentSightings || []) {
      if (s.nganya_id && !m.has(s.nganya_id)) m.set(s.nganya_id, s);
    }
    return m;
  }, [recentSightings]);

  const selectedCorridor = draft.corridorId ? corridorById.get(draft.corridorId) || null : null;
  const selectedNganyaData = draft.nganyaId ? nganyas.find((n) => n.id === draft.nganyaId) || null : null;

  const corroboratingSighting = useMemo(() => {
    if (!draft.nganyaId) return null;
    return recentSightings.find((s) => s.nganya_id === draft.nganyaId) || null;
  }, [draft.nganyaId, recentSightings]);

  const corroborationMinutes = useMemo(() => {
    if (!corroboratingSighting?.created_at) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(corroboratingSighting.created_at).getTime()) / 60000));
  }, [corroboratingSighting]);

  const duplicateWindowSighting = useMemo(() => {
    if (!draft.nganyaId) return null;
    return (mySightings || []).find((s) => {
      if (s.nganya_id !== draft.nganyaId) return false;
      return Date.now() - new Date(s.created_at).getTime() <= 5 * 60 * 1000;
    }) || null;
  }, [draft.nganyaId, mySightings]);

  const qualitySummary = useMemo(() => buildQualitySummary({
    corridorName: selectedCorridor?.name || null, direction: draft.direction, photoName: selectedPhotoName,
    evidenceTags: draft.evidenceTags, locationGranted: geolocation.permissionStatus === "granted" || routeFitChecked,
    corridorFit: routeFitChecked ? !isCorridorBlocking : false, corridorDistance: routeFitDistance,
    corroborationMinutes, duplicatePenalty: Boolean(duplicateWindowSighting),
  }), [selectedCorridor?.name, draft.direction, selectedPhotoName, draft.evidenceTags, geolocation.permissionStatus, routeFitChecked, isCorridorBlocking, routeFitDistance, corroborationMinutes, duplicateWindowSighting]);

  const spotCandidates = useMemo<SpotCandidate[]>(() => {
    const cId = draft.corridorId;
    const q = searchQuery.trim().toLowerCase();
    const unique = Array.from(
      new Map(
        (nganyas || [])
          .filter((n): n is FanNganyaRecord & { id: string } => Boolean(n.id))
          .map((n) => [n.id, n] as const),
      ).values(),
    );
    const scoped = unique.filter((n) => !cId || n.corridor_id === cId).map((n) => {
      const liveCue = liveByNganyaId.get(n.id) || null;
      const recentCue = recentByNganyaId.get(n.id) || null;
      const cn = n.corridors?.name || "Unknown route";
      const isFollowed = followedIds.has(n.id);
      const textScore = q ? (n.name?.toLowerCase().includes(q) ? 1000 : cn.toLowerCase().includes(q) ? 400 : 0) : 0;
      return { ...n, corridorName: cn, liveCue, recentCue, isFollowed, lastSeenAt: liveCue?.last_ping_at || recentCue?.created_at || null, rank: (liveCue ? 3000 : recentCue ? 1800 : 0) + (isFollowed ? 800 : 0) + textScore };
    }).filter((candidate) => !q || candidate.name?.toLowerCase().includes(q) || candidate.corridorName?.toLowerCase().includes(q));
    return scoped.sort((a, b) => b.rank - a.rank);
  }, [draft.corridorId, nganyas, searchQuery, liveByNganyaId, recentByNganyaId, followedIds]);

  const directionOptions = getDirectionOptions(selectedCorridor?.name || null);

  const applyLocationSuggestion = async () => {
    if (!draft.corridorId && locationSuggestion.corridorId) { setDraft((c) => ({ ...c, corridorId: locationSuggestion.corridorId })); return; }
    setIsDetectingCorridor(true);
    try {
      const coords = await geolocation.getCurrentPosition();
      const candidates = await Promise.all(
        corridors.map(async (c: FanCorridorRecord) => ({
          corridor: c,
          nearest:
            (await findClosestStagesForCorridor(c.id, coords.lat, coords.lng))[0] ||
            null,
        })),
      );
      const best = candidates.filter((i) => i.nearest).sort((a, b) => (a.nearest?.distance_m || Infinity) - (b.nearest?.distance_m || Infinity))[0];
      if (best?.corridor) { setLocationSuggestion({ corridorId: best.corridor.id, corridorName: best.corridor.name, source: "location" }); setDraft((c) => ({ ...c, corridorId: c.corridorId || best.corridor.id })); }
    } catch (err) { addToast(getUserMessage(toAppError(err)), "error"); } finally { setIsDetectingCorridor(false); }
  };

  const goBack = () => { if (step === "which") setStep("where"); else if (step === "evidence") setStep("which"); else if (step === "confirm") setStep("evidence"); };
  const showFlowError = (msg: string) => { setSubmitError(msg); addToast(msg, "error"); };
  const continueFromWhich = () => { if (draft.nganyaId) setStep("evidence"); };
  const continueFromEvidence = () => { if (draft.nganyaId && draft.corridorId && draft.direction) setStep("confirm"); };

  const toggleContextTag = (tag: string) => {
    setDraft((c) => ({ ...c, evidenceTags: c.evidenceTags.includes(tag) ? c.evidenceTags.filter((t) => t !== tag) : [...c.evidenceTags, tag].slice(0, 4) }));
  };

  const verifyCorridorFit = async (corridorId: string, lat: number, lng: number) => {
    const stages = await findClosestStagesForCorridor(corridorId, lat, lng);
    const nearest = stages[0] || null;
    const dist = nearest?.distance_m ?? null;
    setRouteFitDistance(dist); setRouteFitStageId(nearest?.id || null); setRouteFitChecked(true);
    if (dist === null || dist > 1500) {
      setIsCorridorBlocking(true);
      const msg = "Your location does not seem to match this route. Change route or cancel.";
      setCorridorWarning(msg); addToast(msg, "error"); return { valid: false, nearest };
    }
    setIsCorridorBlocking(false); setCorridorWarning(null); return { valid: true, nearest };
  };

  const continueFromWhere = async () => {
    if (!draft.corridorId || !draft.direction) return;
    setIsValidatingRoute(true); setSubmitError(null);
    try {
      const coords = await geolocation.getCurrentPosition();
      const fit = await verifyCorridorFit(draft.corridorId, coords.lat, coords.lng);
      if (!fit.valid) return;
      setStep("which");
    } catch (err) {
      const msg = getUserMessage(toAppError(err)) || "Allow live location so we can verify this route before you continue.";
      setCorridorWarning(msg); addToast(msg, "error");
    } finally { setIsValidatingRoute(false); }
  };

  const handleSubmit = async () => {
    if (!draft.nganyaId || !draft.corridorId || !draft.direction) return;
    if (duplicateWindowSighting) { showFlowError("You already spotted this nganya a moment ago. Give it a few minutes before posting again."); return; }
    if (!routeFitChecked || isCorridorBlocking) { showFlowError("Verify your route before you confirm this live signal."); return; }
    setIsSubmitting(true); setSubmitError(null);
    try {
      if (!isAuthenticated) { navigate({ to: "/signin" }); return; }
      const coords = await geolocation.getCurrentPosition();
      await postSighting({ nganya_id: draft.nganyaId, corridor_id: draft.corridorId, stage_id: routeFitStageId, location: `POINT(${coords.lng} ${coords.lat})`, direction: draft.direction, note: [draft.evidenceTags.join(" - "), draft.note.trim()].filter(Boolean).join("\n") });
      addToast("Sighting posted. You just boosted this live signal.", "success");
      setSubmittedNganyaName(selectedNganyaData?.name || null); setSubmittedQuality(qualitySummary); setSubmittedCorroborationMinutes(corroborationMinutes);
    } catch (err) { showFlowError(getUserMessage(toAppError(err))); } finally { setIsSubmitting(false); }
  };

  return {
    navigate, step, setStep, searchQuery, setSearchQuery, draft, setDraft,
    locationSuggestion, isDetectingCorridor, routeFitChecked, isCorridorBlocking,
    routeFitDistance, corridorWarning, isValidatingRoute, isSubmitting, submitError,
    confirmationChecked, selectedPhotoName, setSelectedPhotoName,
    selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl,
    submittedQuality, submittedNganyaName, submittedCorroborationMinutes,
    selectedCorridor, selectedNganyaData, qualitySummary, corroborationMinutes,
    duplicateWindowSighting, spotCandidates, directionOptions,
    isAuthenticated, corridors,
    applyLocationSuggestion, goBack, continueFromWhich, continueFromEvidence,
    toggleContextTag, continueFromWhere, handleSubmit,
  };
}
