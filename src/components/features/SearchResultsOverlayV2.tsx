/**
 * SearchResultsOverlayV2 — Revamped results with catchability-based CTAs
 *
 * Key improvements:
 * - Catchability logic (CATCHABLE/RISKY/TOO_FAR) drives CTA display
 * - Trust cues: ETA, freshness, confidence, source badge
 * - Plan B alternatives drawer
 * - Loading states with InlineTableLoader
 * - Real-time updates with toast notifications
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../ui/Modal";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import ConfidenceBadge from "../ui/ConfidenceBadge";
import TrackDrawer from "./TrackDrawer";
import { searchNganyaJourney } from "../../lib/queries/discover";
import { supabase } from "../../lib/supabase";
import {
  Clock,
  MapPin,
  Map,
  Navigation2,
  AlertTriangle,
  Bell,
  Zap,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { InlineTableLoader } from "../ui/loading";

const ToastMessage = ({
  message,
  show,
}: {
  message: string;
  show: boolean;
}) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--color-bg-surface)] border border-[var(--color-accent-soft)] text-[var(--color-accent)] px-4 py-2 rounded-full shadow-lg z-50 text-sm animate-fade-in flex items-center gap-2">
      <Zap className="w-4 h-4" />
      {message}
    </div>
  );
};

type CatchabilityStatus = "CATCHABLE" | "RISKY" | "TOO_FAR";

interface CatchabilityInfo {
  status: CatchabilityStatus;
  label: string;
  color: string;
  primaryCta: string;
  secondaryCta?: string;
}

const getCatchability = (eta: number, confidence: string): CatchabilityInfo => {
  // Catchable: ETA <= 12 AND confidence != LOW
  if (eta <= 12 && confidence !== "LOW") {
    return {
      status: "CATCHABLE",
      label: "Catchable",
      color: "text-[var(--color-green)]",
      primaryCta: "Track",
    };
  }

  // Risky: ETA 13-20 OR confidence MED
  if ((eta > 12 && eta <= 20) || confidence === "MEDIUM") {
    return {
      status: "RISKY",
      label: "Risky",
      color: "text-[var(--color-accent)]",
      primaryCta: "See alternatives",
      secondaryCta: "Track anyway",
    };
  }

  // Too far: ETA > 20 OR confidence LOW
  return {
    status: "TOO_FAR",
    label: "Too Far",
    color: "text-[var(--color-text-tertiary)]",
    primaryCta: "Follow + Alerts",
    secondaryCta: "Similar nganyas",
  };
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fromStage: { id: string; name: string };
  toPlace: { id: string; name: string; corridor_id?: string };
  preference: "ANY" | "NEWEST" | "SPECIFIC";
  preferredNganya: { id: string; name: string } | null;
  inline?: boolean;
}

export default function SearchResultsOverlayV2({
  isOpen,
  onClose,
  fromStage,
  toPlace,
  preference,
  preferredNganya,
  inline = false,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [trackingNganya, setTrackingNganya] = useState<any | null>(null);
  const [alternativesFor, setAlternativesFor] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const bestEtaRef = useRef<number | null>(null);
  const corridorId = toPlace.corridor_id || toPlace.id;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const normalize = (value: string | null | undefined) =>
    (value || "").trim().toLowerCase();

  const loadResults = async (checkCloser: boolean = false) => {
    if (checkCloser) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = (await searchNganyaJourney({
        corridorId,
        pickupStageId: fromStage.id,
        preferredNganyaId:
          preference === "SPECIFIC" ? preferredNganya?.id : null,
        vibeTags: preference === "NEWEST" ? ["NEW_BUILD"] : null,
        maxResults: 12,
      })) as any[];

      const corridorScoped = (data || []).filter((item) => {
        return normalize(item.corridor_name) === normalize(toPlace.name);
      });

      const nextBestEta =
        corridorScoped.length > 0
          ? Math.min(
              ...corridorScoped
                .map((item) => item.eta_minutes)
                .filter((eta: number) => Number.isFinite(eta)),
            )
          : null;

      if (
        checkCloser &&
        bestEtaRef.current !== null &&
        nextBestEta !== null &&
        nextBestEta < bestEtaRef.current
      ) {
        setToastMsg("Closer match available 🔥");
        setTimeout(() => setToastMsg(""), 3000);
      }

      bestEtaRef.current = nextBestEta;
      setResults(corridorScoped);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadResults(false);
    }
  }, [isOpen, corridorId, fromStage.id, preference, preferredNganya?.id]);

  useEffect(() => {
    if (!isOpen || !corridorId) return;

    const channel = supabase
      .channel(`searchResultsRealtime_${corridorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `corridor_id=eq.${corridorId}`,
        },
        () => loadResults(true),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sightings",
          filter: `corridor_id=eq.${corridorId}`,
        },
        () => loadResults(true),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, corridorId, fromStage.id, preference, preferredNganya?.id]);

  const getLastSeenText = (item: any) => {
    if (!item?.last_seen_at) return "Updated recently";

    const seenAt = new Date(item.last_seen_at).getTime();
    if (!Number.isFinite(seenAt)) return "Updated recently";

    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - seenAt) / 1000),
    );
    if (item.source === "LIVE") {
      return `Pinged ${elapsedSeconds}s ago`;
    }

    const elapsedMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));
    return `Spotted ${elapsedMinutes}m ago`;
  };

  const preferenceLabel = useMemo(() => {
    if (preference === "SPECIFIC")
      return preferredNganya
        ? `Specific (${preferredNganya.name})`
        : "Specific";
    if (preference === "NEWEST") return "Newest";
    return "Any";
  }, [preference, preferredNganya?.name]);

  // Separate live and sighting results
  const liveResults = results.filter((r) => r.source === "LIVE");
  const sightingResults = results.filter((r) => r.source === "SIGHTING");

  const renderResultCard = (r: any) => {
    const catchability = getCatchability(r.eta_minutes, r.confidence_level);
    const StatusIcon =
      catchability.status === "CATCHABLE"
        ? Navigation2
        : catchability.status === "RISKY"
          ? AlertTriangle
          : Bell;

    return (
      <div
        key={r.nganya_id}
        className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 hover:border-[var(--glass-border-hover)] transition-colors"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-h3 text-[var(--color-text-primary)] truncate">
              {r.nganya_name}
            </h3>
            <p className="text-xs text-[var(--color-text-tertiary)] truncate">
              {r.corridor_name}{" "}
              {r.tags && r.tags.length > 0 ? `• ${r.tags.join(", ")}` : ""}
            </p>
          </div>
          <div className="text-right ml-3 shrink-0">
            <div className="text-h2 text-[var(--color-accent)]">
              {r.eta_minutes} <span className="text-sm font-normal">min</span>
            </div>
            <div
              className={`text-[10px] font-bold uppercase flex items-center gap-1 justify-end ${catchability.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {catchability.label}
            </div>
          </div>
        </div>

        {/* Trust cues */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <ConfidenceBadge level={r.confidence_level} />
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              r.source === "LIVE"
                ? "bg-[var(--color-green-soft)] border-[var(--color-green)] text-[var(--color-green)]"
                : "bg-[var(--color-bg-body)] border-[var(--color-line)] text-[var(--color-text-secondary)]"
            }`}
          >
            {r.source === "LIVE" ? "🔴 LIVE" : "SIGHTING"}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
            <Clock className="w-3 h-3" /> {getLastSeenText(r)}
          </span>
        </div>

        {/* CTAs based on catchability */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
          {catchability.status === "CATCHABLE" && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => setTrackingNganya(r)}
            >
              <Navigation2 className="w-4 h-4" />
              {catchability.primaryCta}
            </Button>
          )}

          {catchability.status === "RISKY" && (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setAlternativesFor(r.nganya_id)}
              >
                {catchability.primaryCta}
              </Button>
              <Button variant="ghost" onClick={() => setTrackingNganya(r)}>
                {catchability.secondaryCta}
              </Button>
            </>
          )}

          {catchability.status === "TOO_FAR" && (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => console.log("Follow + Alerts", r.nganya_id)}
              >
                <Bell className="w-4 h-4" />
                {catchability.primaryCta}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setAlternativesFor(r.nganya_id)}
              >
                {catchability.secondaryCta}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const content = (
    <div
      className={`flex flex-col relative ${inline ? "" : "h-full max-h-[85vh]"}`}
    >
      <ToastMessage message={toastMsg} show={!!toastMsg} />

      {/* Search context */}
      <div className="mb-4 space-y-1 shrink-0">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Map className="w-4 h-4 text-[var(--color-accent)]" />
          Route:{" "}
          <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[170px]">
            {toPlace.name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <MapPin className="w-4 h-4" />
          Pickup:{" "}
          <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[170px]">
            {fromStage.name}
          </span>
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          Preference:{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {preferenceLabel}
          </span>
        </div>
      </div>

      {/* Refetching indicator */}
      {isRefetching && <InlineTableLoader />}

      {/* Results */}
      <div className={`${inline ? "" : "flex-1 overflow-y-auto"} pb-6`}>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-6">
            {/* Live options first */}
            {liveResults.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-green)] animate-pulse" />
                  Live Now ({liveResults.length})
                </h4>
                <div className="space-y-3">
                  {liveResults.map(renderResultCard)}
                </div>
              </div>
            )}

            {/* Sighting fallbacks */}
            {sightingResults.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
                  Recent Sightings ({sightingResults.length})
                </h4>
                {liveResults.length === 0 && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mb-3 p-2 rounded bg-[var(--glass-bg)] border border-[var(--color-line)]">
                    No crews live right now — using recent sightings
                  </p>
                )}
                <div className="space-y-3">
                  {sightingResults.slice(0, 3).map(renderResultCard)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed border-[var(--color-line)] rounded-[var(--radius-lg)]">
            <p className="text-[var(--color-text-secondary)] mb-2">
              No active rides found for this route right now.
            </p>
            <Button variant="secondary" onClick={onClose}>
              Adjust Search
            </Button>
          </div>
        )}
      </div>

      {/* Track Drawer */}
      {trackingNganya && (
        <TrackDrawer
          isOpen={!!trackingNganya}
          onClose={() => setTrackingNganya(null)}
          nganya={trackingNganya}
          stage={fromStage}
          allResults={results}
          onSwitch={(newNganya) => setTrackingNganya(newNganya)}
        />
      )}

      {/* Alternatives Drawer */}
      {alternativesFor && (
        <AlternativesDrawer
          isOpen={!!alternativesFor}
          onClose={() => setAlternativesFor(null)}
          currentNganyaId={alternativesFor}
          alternatives={results
            .filter((r) => r.nganya_id !== alternativesFor)
            .slice(0, 3)}
          onSelect={(nganya) => {
            setAlternativesFor(null);
            setTrackingNganya(nganya);
          }}
        />
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Ride Options">
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ride Options" size="md">
      {content}
    </Modal>
  );
}

// Alternatives Drawer Component
function AlternativesDrawer({
  isOpen,
  onClose,
  currentNganyaId,
  alternatives,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentNganyaId: string;
  alternatives: any[];
  onSelect: (nganya: any) => void;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const content = (
    <div className="flex flex-col gap-3">
      {alternatives.length > 0 ? (
        <>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Better options available for catching:
          </p>
          {alternatives.map((alt) => {
            const catchability = getCatchability(
              alt.eta_minutes,
              alt.confidence_level,
            );
            return (
              <button
                key={alt.nganya_id}
                onClick={() => onSelect(alt)}
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--color-accent-soft)] transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {alt.nganya_name}
                    </h4>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {alt.source === "LIVE" ? "🔴 LIVE" : "SIGHTING"}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-lg font-bold text-[var(--color-accent)]">
                      {alt.eta_minutes}m
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase ${catchability.color}`}
                    >
                      {catchability.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <ConfidenceBadge level={alt.confidence_level} />
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                </div>
              </button>
            );
          })}
        </>
      ) : (
        <div className="text-center p-6 border border-dashed border-[var(--color-line)] rounded-[var(--radius-lg)]">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No alternative rides available right now.
          </p>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Better Alternatives"
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Better Alternatives"
      size="sm"
    >
      {content}
    </Modal>
  );
}
