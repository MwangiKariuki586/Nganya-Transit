import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../ui/Modal";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import ConfidenceBadge from "../ui/ConfidenceBadge";
import TrackModeOverlay from "./TrackModeOverlay";
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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[var(--color-bg-surface)] border border-[var(--color-accent-soft)] text-[var(--color-accent)] px-4 py-2 rounded-full shadow-lg z-50 text-sm animate-fade-in">
      {message}
    </div>
  );
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

export default function SearchResultsOverlay({
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
  const [trackingNganya, setTrackingNganya] = useState<any | null>(null);
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
    setIsLoading(true);
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
        setToastMsg("New closer match available");
        setTimeout(() => setToastMsg(""), 3000);
      }

      bestEtaRef.current = nextBestEta;
      setResults(corridorScoped);
      console.log("Analytics: ride_search_results_loaded", {
        count: corridorScoped.length,
        corridor: corridorId,
      });
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsLoading(false);
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

  const getStatusInfo = (eta: number, confidence: string) => {
    if (eta <= 12 && confidence !== "LOW") {
      return {
        label: "Catchable",
        color: "text-[var(--color-green)]",
        cta: "Track",
      };
    }
    if (eta > 20 || confidence === "LOW") {
      return {
        label: "Too Far",
        color: "text-[var(--color-text-tertiary)]",
        cta: "Follow + Alerts",
      };
    }
    return {
      label: "Risky",
      color: "text-[var(--color-accent)]",
      cta: "Track",
    };
  };

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

  const yourPick = results.filter((r) => r.match_bucket === "YOUR_PICK");
  const vibeMatch = results.filter((r) => r.match_bucket === "VIBE_MATCH");
  const fastest = results.filter((r) => r.match_bucket === "FASTEST");

  const renderBucket = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-4">
          {title}
        </h4>
        <div className="space-y-3">
          {items.map((r) => {
            const status = getStatusInfo(r.eta_minutes, r.confidence_level);
            return (
              <div
                key={r.nganya_id}
                className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-h3 text-[var(--color-text-primary)]">
                      {r.nganya_name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {r.corridor_name}{" "}
                      {r.tags && r.tags.length > 0
                        ? `- ${r.tags.join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-h2 text-[var(--color-accent)]">
                      {r.eta_minutes}{" "}
                      <span className="text-sm font-normal">min</span>
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase ${status.color}`}
                    >
                      {status.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <ConfidenceBadge level={r.confidence_level} />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-body)] border border-[var(--color-line)] text-[var(--color-text-secondary)]">
                    {r.source === "LIVE" ? "LIVE" : "SIGHTING"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-[var(--glass-border)]">
                  <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {getLastSeenText(r)}
                  </div>
                  <Button
                    variant={status.cta === "Track" ? "primary" : "secondary"}
                    onClick={() => {
                      if (status.cta === "Track") {
                        console.log("Analytics: result_selected_track", {
                          nganya_id: r.nganya_id,
                        });
                        setTrackingNganya(r);
                        return;
                      }
                      console.log("Analytics: follow_from_results", {
                        nganya_id: r.nganya_id,
                      });
                    }}
                  >
                    {status.cta === "Track" ? (
                      <>
                        <Navigation2 className="w-4 h-4 mr-1" />
                        Track
                      </>
                    ) : (
                      "Follow + Alerts"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const content = (
    <div
      className={`flex flex-col relative ${inline ? "" : "h-full max-h-[85vh]"}`}
    >
      <ToastMessage message={toastMsg} show={!!toastMsg} />
      <div className="mb-4 space-y-1">
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

      <div className={`${inline ? "" : "flex-1 overflow-y-auto"} pb-6`}>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse w-8 h-8 rounded-full bg-[var(--color-accent)]"></div>
          </div>
        ) : results.length > 0 ? (
          <>
            {renderBucket("Your Pick", yourPick)}
            {renderBucket("Vibe Match", vibeMatch)}
            {renderBucket("Fastest Options", fastest)}
          </>
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

      {trackingNganya && (
        <TrackModeOverlay
          isOpen={!!trackingNganya}
          onClose={() => setTrackingNganya(null)}
          nganya={trackingNganya}
          stage={fromStage}
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
