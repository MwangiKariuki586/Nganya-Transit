import type { RefObject } from "react";
import { Radio } from "lucide-react";
import Button from "@/components/ui/Button";
import type { PermissionStateLocal } from "./crew-live-types";

interface CrewMobileStickyBarProps {
  nextRequired: "location" | "direction" | "seats" | "start";
  permissionStatus: PermissionStateLocal;
  stickyHelperText: string;
  startIsActive: boolean;
  isStarting: boolean;
  canStart: boolean;
  onStart: () => void;
  onLocationAction: () => void;
  onScrollToDirection: () => void;
  onScrollToSeats: () => void;
  startLiveButtonRef: RefObject<HTMLDivElement | null>;
}

export function CrewMobileStickyBar({
  nextRequired,
  permissionStatus,
  stickyHelperText,
  startIsActive,
  isStarting,
  canStart,
  onStart,
  onLocationAction,
  onScrollToDirection,
  onScrollToSeats,
  startLiveButtonRef,
}: CrewMobileStickyBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-[var(--z-fab)] border-t border-[var(--glass-border)] bg-[var(--color-bg-base)]/92 px-4 py-3 backdrop-blur-xl md:hidden">
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
              {nextRequired === "seats" && "Tap to jump to seats settings"}
              {nextRequired === "start" && stickyHelperText}
            </div>
            {nextRequired !== "start" && (
              <button
                type="button"
                className="rounded-[12px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-xs font-semibold text-[var(--color-accent)]"
                onClick={() => {
                  if (nextRequired === "location") {
                    onLocationAction();
                  } else if (nextRequired === "direction") {
                    onScrollToDirection();
                  } else if (nextRequired === "seats") {
                    onScrollToSeats();
                  }
                }}
              >
                {nextRequired === "location" &&
                  (permissionStatus === "denied" ? "Retry location" : "Enable")}
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
            onClick={onStart}
          >
            <Radio className="h-4 w-4" />
            Start Live
          </Button>
        </div>
      </div>
    </div>
  );
}
