/**
 * TrackDrawer — Guidance-first tracking experience
 *
 * Key features:
 * - Primary focus: catch guidance (ETA, freshness, "leave now" hints)
 * - Source transparency (LIVE vs SIGHTING)
 * - Plan B alternatives always available
 * - Stale state detection and warnings
 * - Boarded/Missed as secondary actions
 * - Real-time updates
 */

import { useState, useEffect, useMemo } from "react";
import Modal from "../ui/Modal";
import BottomSheet from "../ui/BottomSheet";
import Button from "../ui/Button";
import ConfidenceBadge from "../ui/ConfidenceBadge";
import {
  Navigation2,
  Activity,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Bell,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { LoadingButton } from "../ui/loading";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nganya: any;
  stage: { id: string; name: string };
  allResults?: any[];
  onSwitch?: (nganya: any) => void;
}

export default function TrackDrawer({
  isOpen,
  onClose,
  nganya,
  stage,
  allResults = [],
  onSwitch,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [latestEta, setLatestEta] = useState(nganya.eta_minutes);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [confidence, setConfidence] = useState(nganya.confidence_level);
  const [source, setSource] = useState(nganya.source);
  const [showPlanB, setShowPlanB] = useState(false);
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  const [walkTime, setWalkTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check location permission
  useEffect(() => {
    if (!isOpen || typeof navigator === "undefined" || !navigator.permissions)
      return;

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        setLocationPermission(result.state as any);

        if (result.state === "granted" && navigator.geolocation) {
          // Mock walk time calculation - in real app, calculate from user location to stage
          setWalkTime(Math.floor(Math.random() * 8) + 2); // 2-10 minutes
        }
      })
      .catch(() => {
        setLocationPermission("prompt");
      });
  }, [isOpen]);

  // Real-time subscription
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel(`track_nganya_${nganya.nganya_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_sessions",
          filter: `nganya_id=eq.${nganya.nganya_id}`,
        },
        (payload) => {
          // Update ETA and freshness
          setLastUpdate(new Date());
          // In real app, recalculate ETA from payload.new.last_location
          if (latestEta > 1) {
            setLatestEta((prev) => Math.max(1, prev - 1));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, nganya.nganya_id]);

  // Stale detection
  const secondsSinceUpdate = useMemo(() => {
    return Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
  }, [lastUpdate]);

  const isStale = secondsSinceUpdate > 90;
  const isVeryStale = secondsSinceUpdate > 180;

  // Adjust confidence based on staleness
  useEffect(() => {
    if (isVeryStale && source === "LIVE") {
      setSource("SIGHTING");
      setConfidence("LOW");
    } else if (isStale && confidence === "HIGH") {
      setConfidence("MEDIUM");
    }
  }, [isStale, isVeryStale]);

  // Movement guidance
  const movementGuidance = useMemo(() => {
    if (!walkTime) return null;

    const buffer = 2; // minutes buffer
    const timeToLeave = latestEta - walkTime - buffer;

    if (timeToLeave <= 0) {
      return {
        action: "LEAVE_NOW",
        message: "Leave now!",
        color: "text-[var(--color-accent)]",
        bgColor: "bg-[var(--color-accent-soft)]",
      };
    } else if (timeToLeave <= 3) {
      return {
        action: "PREPARE",
        message: `Get ready — leave in ${timeToLeave}m`,
        color: "text-[var(--color-accent)]",
        bgColor: "bg-[var(--color-accent-soft)]",
      };
    } else {
      return {
        action: "WAIT",
        message: `You can wait — ${timeToLeave}m until you need to leave`,
        color: "text-[var(--color-text-secondary)]",
        bgColor: "bg-[var(--glass-bg)]",
      };
    }
  }, [walkTime, latestEta]);

  // Plan B alternatives
  const alternatives = useMemo(() => {
    return allResults
      .filter(
        (r) =>
          r.nganya_id !== nganya.nganya_id && r.eta_minutes < latestEta + 5,
      )
      .slice(0, 2);
  }, [allResults, nganya.nganya_id, latestEta]);

  const handleConfirm = async (action: "BOARDED" | "MISSED") => {
    setIsSubmitting(true);

    try {
      // In real app: save to user_journeys table
      await new Promise((resolve) => setTimeout(resolve, 500)); // Mock delay

      console.log(`Analytics: ${action.toLowerCase()}_confirmed`, {
        nganya_id: nganya.nganya_id,
        predicted_eta: nganya.eta_minutes,
        actual_eta: latestEta,
      });

      if (action === "BOARDED") {
        // Success state - could show a success toast
        onClose();
      } else {
        // Show recovery options
        if (alternatives.length > 0) {
          setShowPlanB(true);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("Failed to record outcome:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPermission("granted");
        setWalkTime(Math.floor(Math.random() * 8) + 2);
      },
      () => {
        setLocationPermission("denied");
      },
    );
  };

  const content = (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-h2 text-[var(--color-text-primary)] truncate">
            {nganya.nganya_name}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Arriving at {stage.name}
          </p>
        </div>
        {onSwitch && alternatives.length > 0 && (
          <button
            onClick={() => setShowPlanB(!showPlanB)}
            className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors shrink-0 ml-2"
          >
            Switch
          </button>
        )}
      </div>

      {/* Stale warning */}
      {isStale && (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--color-text-primary)]">
            <strong>Tracking stale</strong> — Last update {secondsSinceUpdate}s
            ago. Consider alternatives below.
          </div>
        </div>
      )}

      {/* Primary guidance block */}
      <div className="relative p-6 rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        {/* Animated glow for live */}
        {source === "LIVE" && !isStale && (
          <div className="absolute inset-0 bg-[var(--color-accent)] opacity-10 blur-xl rounded-[var(--radius-xl)] animate-pulse-slow pointer-events-none" />
        )}

        <div className="relative z-10 text-center space-y-3">
          {/* ETA */}
          <div>
            <div className="text-display text-[var(--color-accent)] leading-none">
              {latestEta}
              <span className="text-h3 font-normal ml-1">min</span>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Estimated arrival
            </p>
          </div>

          {/* Source & Confidence */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 ${
                source === "LIVE" && !isStale
                  ? "bg-[var(--color-green-soft)] border-[var(--color-green)] text-[var(--color-green)]"
                  : "bg-[var(--glass-bg)] border-[var(--color-line)] text-[var(--color-text-secondary)]"
              }`}
            >
              {source === "LIVE" && !isStale && (
                <div className="w-2 h-2 rounded-full bg-[var(--color-green)] animate-pulse" />
              )}
              {source === "LIVE" && !isStale
                ? "LIVE tracking active"
                : "Sightings-based estimate"}
            </span>
            <ConfidenceBadge level={confidence} />
          </div>

          {/* Freshness */}
          <div className="text-xs text-[var(--color-text-tertiary)] flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Updated {secondsSinceUpdate}s ago
          </div>
        </div>
      </div>

      {/* Movement guidance */}
      {movementGuidance ? (
        <div
          className={`p-4 rounded-[var(--radius-md)] ${movementGuidance.bgColor} border border-[var(--glass-border)]`}
        >
          <div className="flex items-start gap-3">
            <MapPin
              className={`w-5 h-5 ${movementGuidance.color} shrink-0 mt-0.5`}
            />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${movementGuidance.color}`}>
                {movementGuidance.message}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                ~{walkTime}m walk to {stage.name}
              </p>
            </div>
          </div>
        </div>
      ) : locationPermission === "prompt" ? (
        <button
          onClick={requestLocation}
          className="p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--color-accent-soft)] transition-colors text-left"
        >
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4" />
            Enable location for walk-time guidance
          </div>
        </button>
      ) : null}

      {/* Plan B block */}
      {alternatives.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--glass-border)] overflow-hidden">
          <button
            onClick={() => setShowPlanB(!showPlanB)}
            className="w-full p-3 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-strong)] transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="font-semibold text-[var(--color-text-primary)]">
                {alternatives.length} closer option
                {alternatives.length > 1 ? "s" : ""} available
              </span>
            </div>
            {showPlanB ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showPlanB && (
            <div className="p-3 space-y-2 bg-[var(--color-bg-body)]">
              {alternatives.map((alt) => (
                <button
                  key={alt.nganya_id}
                  onClick={() => onSwitch?.(alt)}
                  className="w-full p-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--color-accent-soft)] transition-colors text-left"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {alt.nganya_name}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        {alt.source === "LIVE" ? "🔴 LIVE" : "SIGHTING"}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-lg font-bold text-[var(--color-accent)]">
                        {alt.eta_minutes}m
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outcome capture (secondary) */}
      <div className="pt-4 border-t border-[var(--glass-border)] flex flex-col gap-3">
        <p className="text-xs text-[var(--color-text-tertiary)] text-center">
          Did you catch it?
        </p>
        <div className="flex gap-3">
          <LoadingButton
            variant="secondary"
            className="flex-1 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
            onClick={() => handleConfirm("MISSED")}
            isLoading={isSubmitting}
          >
            <XCircle className="w-4 h-4" /> Missed it
          </LoadingButton>
          <LoadingButton
            variant="primary"
            className="flex-1 bg-[var(--color-green)] text-white hover:bg-[#00cc00]"
            onClick={() => handleConfirm("BOARDED")}
            isLoading={isSubmitting}
          >
            <CheckCircle className="w-4 h-4" /> I Boarded
          </LoadingButton>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Live Tracking">
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Live Tracking" size="sm">
      {content}
    </Modal>
  );
}
