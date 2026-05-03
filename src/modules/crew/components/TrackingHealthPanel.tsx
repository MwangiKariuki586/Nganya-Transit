/**
 * TrackingHealthPanel — Compact crew tracking health status row.
 *
 * Shows a single line of status chips that communicate the current state of
 * the live tracking pipeline without overloading the crew with technical detail.
 *
 * Derives all display from props — no internal state, no hooks.
 * Consumes values already returned by useCrewLiveSessionV2.
 *
 * States covered:
 *   Location:   checking | ready | denied | unavailable
 *   Tracking:   watching | not watching
 *   Upload:     uploading | success (with age) | error/retrying | offline | backgrounded | recovered
 *   Session:    stale (last upload > 90 s ago)
 *
 * Copy rules (spec §06):
 *   - "Tracking live"
 *   - "Last update Xs ago"
 *   - "Keep this screen open for best accuracy"
 *   - "Tracking recovered"
 *   - "Location needed to stay live"
 *   - No technical jargon (no "watchPosition", "GPS fix", "STALE", etc.)
 */

import {
  Satellite,
  Radio,
  RefreshCw,
  WifiOff,
  Eye,
  EyeOff,
} from "lucide-react";
import type { LocationReadiness } from "@/modules/crew/hooks/useCrewLocationRuntime";
import type { UploadStatus } from "@/modules/crew/hooks/useLiveLocationUploader";
import type { ClientState } from "@/modules/crew/lib/location-upload";
import { formatAgeShort } from "@/lib/tracking-signal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackingHealthPanelProps {
  /** From useCrewLocationRuntime */
  locationReadiness: LocationReadiness;
  /** Whether the watcher is currently active */
  isWatching: boolean;
  /** From useLiveLocationUploader */
  uploadStatus: UploadStatus;
  /** From useLiveLocationUploader */
  clientState: ClientState;
  /** ms since last successful upload — 0 if none yet */
  lastUploadAgeMs: number;
  /** Whether a failed upload is pending retry */
  hasPendingUpload: boolean;
  /** Called when crew taps the retry chip */
  onRetry?: () => void;
  className?: string;
}

// ─── Derived state → display config ──────────────────────────────────────────

interface ChipConfig {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  tone: "live" | "ok" | "warn" | "error" | "muted";
  /** Show a spinner animation on the icon */
  spinning?: boolean;
  /** Whether tapping this chip calls onRetry */
  retryable?: boolean;
}

function deriveChips(props: TrackingHealthPanelProps): ChipConfig[] {
  const {
    locationReadiness,
    isWatching,
    uploadStatus,
    clientState,
    lastUploadAgeMs,
    hasPendingUpload,
  } = props;

  const chips: ChipConfig[] = [];

  // ── Location chip ──────────────────────────────────────────────────────────
  if (locationReadiness === "checking") {
    chips.push({
      icon: <Satellite className="h-3 w-3" />,
      label: "Checking location…",
      tone: "muted",
    });
  } else if (locationReadiness === "granted" && isWatching) {
    chips.push({
      icon: <Satellite className="h-3 w-3" />,
      label: "Location ready",
      tone: "ok",
    });
  } else if (locationReadiness === "granted" && !isWatching) {
    chips.push({
      icon: <Satellite className="h-3 w-3" />,
      label: "Location ready",
      tone: "ok",
    });
  } else if (
    locationReadiness === "denied" ||
    locationReadiness === "blocked"
  ) {
    chips.push({
      icon: <Satellite className="h-3 w-3" />,
      label: "Location needed to stay live",
      tone: "error",
    });
  } else if (locationReadiness === "unavailable") {
    chips.push({
      icon: <Satellite className="h-3 w-3" />,
      label: "Location unavailable",
      tone: "error",
    });
  } else {
    // prompt_required
    chips.push({
      icon: <Satellite className="h-3 w-3" />,
      label: "Enable location",
      tone: "warn",
    });
  }

  // ── Tracking / upload chip ─────────────────────────────────────────────────
  if (clientState === "backgrounded") {
    chips.push({
      icon: <EyeOff className="h-3 w-3" />,
      label: "Backgrounded",
      sublabel: "Keep this screen open for best accuracy",
      tone: "warn",
    });
  } else if (clientState === "recovered") {
    chips.push({
      icon: <Eye className="h-3 w-3" />,
      label: "Tracking recovered",
      tone: "ok",
    });
  } else if (clientState === "offline" || uploadStatus === "offline") {
    chips.push({
      icon: <WifiOff className="h-3 w-3" />,
      label: "Offline / retrying",
      tone: "error",
      retryable: hasPendingUpload,
    });
  } else if (uploadStatus === "uploading") {
    chips.push({
      icon: <Radio className="h-3 w-3" />,
      label: "Uploading update…",
      tone: "live",
      spinning: true,
    });
  } else if (uploadStatus === "error" || hasPendingUpload) {
    chips.push({
      icon: <RefreshCw className="h-3 w-3" />,
      label: "Update failed — tap to retry",
      tone: "warn",
      retryable: true,
    });
  } else if (isWatching && uploadStatus === "success") {
    // Show age of last upload — stale if > 90 s
    const ageSec = Math.floor(lastUploadAgeMs / 1_000);
    const isStale = ageSec > 90;

    if (ageSec < 5) {
      chips.push({
        icon: <Radio className="h-3 w-3" />,
        label: "Tracking live",
        tone: "live",
      });
    } else {
      chips.push({
        icon: <Radio className="h-3 w-3" />,
        label: isStale
          ? `Tracking stale · ${formatAgeShort(ageSec)}`
          : `Last update ${formatAgeShort(ageSec)}`,
        tone: isStale ? "warn" : "ok",
      });
    }
  } else if (isWatching) {
    chips.push({
      icon: <Radio className="h-3 w-3" />,
      label: "Tracking live",
      tone: "live",
    });
  }

  return chips;
}

// ─── Tone → style map ─────────────────────────────────────────────────────────

const TONE_STYLES: Record<
  ChipConfig["tone"],
  { container: string; icon: string; text: string }
> = {
  live: {
    container: "border-[rgba(57,255,20,0.25)] bg-[rgba(57,255,20,0.08)]",
    icon: "text-[var(--color-live)]",
    text: "text-[var(--color-live)]",
  },
  ok: {
    container: "border-[var(--glass-border)] bg-[var(--glass-bg)]",
    icon: "text-[var(--color-text-secondary)]",
    text: "text-[var(--color-text-secondary)]",
  },
  warn: {
    container: "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]",
    icon: "text-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
  },
  error: {
    container: "border-red-500/30 bg-red-500/10",
    icon: "text-red-400",
    text: "text-red-300",
  },
  muted: {
    container: "border-[var(--glass-border)] bg-[var(--glass-bg)]",
    icon: "text-[var(--color-text-tertiary)]",
    text: "text-[var(--color-text-tertiary)]",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TrackingHealthPanel({
  onRetry,
  className = "",
  ...props
}: TrackingHealthPanelProps) {
  const chips = deriveChips(props);

  if (chips.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="status"
      aria-label="Tracking health"
    >
      {chips.map((chip, i) => {
        const styles = TONE_STYLES[chip.tone];
        const isRetryable = chip.retryable && onRetry;

        const inner = (
          <>
            <span
              className={`shrink-0 ${styles.icon} ${chip.spinning ? "animate-spin" : ""}`}
            >
              {chip.icon}
            </span>
            <span
              className={`text-xs font-medium leading-tight ${styles.text}`}
            >
              {chip.label}
            </span>
          </>
        );

        if (isRetryable) {
          return (
            <button
              key={i}
              type="button"
              onClick={onRetry}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-opacity hover:opacity-80 active:opacity-60 ${styles.container}`}
              aria-label={chip.label}
            >
              {inner}
            </button>
          );
        }

        return (
          <div
            key={i}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${styles.container}`}
          >
            {inner}
            {chip.sublabel && (
              <span className="ml-1 hidden text-xs opacity-60 sm:inline">
                · {chip.sublabel}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
