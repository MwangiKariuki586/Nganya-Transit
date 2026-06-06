/**
 * SearchResultsOverlayV2 — Corridor live map + inline tracking card
 *
 * - Map shows every nganya on the corridor with LIVE GPS or latest sighting location
 * - Tapping a marker opens an inline tracking card below the map (corridor map stays visible)
 * - Full-screen TrackingMapOverlay is available via expand button on the card
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../ui/Modal";
import BottomSheet from "../ui/BottomSheet";
import LiveCorridorMap from "./tracking/LiveCorridorMap";
import InlineTrackingCard from "./tracking/InlineTrackingCard";
import { searchNganyaJourney } from "../../lib/queries/discover";
import { supabase } from "../../lib/supabase";
import { MapPin, Map, Zap } from "lucide-react";
import { InlineTableLoader, PulseLoader } from "../ui/loading";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { JourneyResult } from "../../lib/types/journey";

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fromStage: { id: string; name: string };
  toPlace: { id: string; name: string; corridor_id?: string };
  preference: "ANY" | "NEWEST" | "SPECIFIC";
  preferredNganya: { id: string; name: string } | null;
  inline?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchResultsOverlayV2({
  isOpen,
  onClose,
  fromStage,
  toPlace,
  preference,
  preferredNganya,
  inline = false,
}: Props) {
  const isMobile = useIsMobile();

  const [results, setResults] = useState<JourneyResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [trackingNganya, setTrackingNganya] = useState<JourneyResult | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const bestEtaRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingCardRef = useRef<HTMLDivElement>(null);

  const corridorId = toPlace.corridor_id || toPlace.id;

  const loadResults = async (isRefetch = false) => {
    if (isRefetch) {
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
        maxResults: 24,
      })) as JourneyResult[];

      const scoped = (data || []).filter((item) => {
        if (item.corridor_id) {
          return item.corridor_id === corridorId;
        }
        const normalize = (v: string) => (v || "").trim().toLowerCase();
        return normalize(item.corridor_name) === normalize(toPlace.name);
      });

      const nextBestEta =
        scoped.length > 0
          ? Math.min(
              ...scoped
                .map((item) => item.eta_minutes)
                .filter((eta) => Number.isFinite(eta)),
            )
          : null;

      if (
        isRefetch &&
        bestEtaRef.current !== null &&
        nextBestEta !== null &&
        nextBestEta < bestEtaRef.current
      ) {
        setToastMsg("Closer match available 🔥");
        setTimeout(() => setToastMsg(""), 3000);
      }

      bestEtaRef.current = nextBestEta;
      setResults(scoped);
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

    const scheduleRefetch = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => loadResults(true), 3_000);
    };

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
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sightings",
          filter: `corridor_id=eq.${corridorId}`,
        },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [isOpen, corridorId, fromStage.id, preference, preferredNganya?.id]);

  useEffect(() => {
    if (!isOpen) setTrackingNganya(null);
  }, [isOpen]);

  useEffect(() => {
    if (trackingNganya && trackingCardRef.current) {
      trackingCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [trackingNganya]);

  const preferenceLabel = useMemo(() => {
    if (preference === "SPECIFIC")
      return preferredNganya ? `Specific (${preferredNganya.name})` : "Specific";
    if (preference === "NEWEST") return "Newest";
    return "Any";
  }, [preference, preferredNganya?.name]);

  const visibleNganyaIds = useMemo((): string[] | null => {
    if (preference === "SPECIFIC") {
      return preferredNganya?.id ? [preferredNganya.id] : null;
    }

    if (preference === "NEWEST") {
      if (!results.length) return null;
      const ids = results
        .map((r) => r.nganya_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      return ids.length ? ids : null;
    }

    return null;
  }, [preference, preferredNganya?.id, results]);

  const content = (
    <div
      className={`flex flex-col relative ${inline ? "" : "h-full max-h-[90vh]"}`}
    >
      <ToastMessage message={toastMsg} show={!!toastMsg} />

      <LiveCorridorMap
        isActive={isOpen}
        corridorId={corridorId}
        corridorName={toPlace.name}
        pickupStage={fromStage}
        journeyResults={results}
        visibleNganyaIds={visibleNganyaIds}
        highlightNganyaId={
          trackingNganya?.nganya_id ??
          (preference === "SPECIFIC" ? preferredNganya?.id ?? null : null)
        }
        onTrackNganya={(j) => setTrackingNganya(j)}
        compact={inline}
        showCaption={false}
        flushBottom={inline && !!trackingNganya}
      />

      {!inline ? (
        <div className="mb-3 shrink-0 text-sm text-[var(--color-text-secondary)] flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Map className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            Route:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {toPlace.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            Pickup:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {fromStage.name}
            </span>
          </div>
          <div>
            Preference:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {preferenceLabel}
            </span>
          </div>
        </div>
      ) : null}

      {trackingNganya ? (
        <div ref={trackingCardRef}>
          <InlineTrackingCard
            nganya={trackingNganya}
            stage={fromStage}
            allResults={results}
            onClose={() => setTrackingNganya(null)}
            onSwitch={(newNganya) => setTrackingNganya(newNganya)}
            flushTop={inline}
          />
        </div>
      ) : null}

      {!inline && isRefetching ? <InlineTableLoader /> : null}

      {!inline && isLoading ? (
        <PulseLoader
          label="Updating trip data..."
          containerClassName="py-4"
          dotClassName="h-6 w-6"
          labelClassName="text-xs text-[var(--color-text-tertiary)]"
        />
      ) : null}
    </div>
  );

  if (inline) {
    return content;
  }

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {content}
    </Modal>
  );
}
