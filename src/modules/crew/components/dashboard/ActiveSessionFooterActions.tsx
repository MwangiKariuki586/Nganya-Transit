/**
 * ActiveSessionFooterActions — Footer action row for the live session dashboard.
 *
 * Contains only the primary destructive "Stop session" action and an optional
 * secondary utility action (e.g. Open notifications).
 *
 * Does NOT include Session history or Preview live view — both are excluded
 * per spec constraints.
 * Purely presentational — no internal state.
 */

import Button from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveSessionFooterActionsProps {
  onStop: () => void;
  isStopping?: boolean;
  onOpenNotifications?: () => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveSessionFooterActions({
  onStop,
  isStopping = false,
  onOpenNotifications,
  className = "",
}: ActiveSessionFooterActionsProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Secondary utility action */}
      {onOpenNotifications && (
        <Button
          variant="secondary"
          size="md"
          className="min-h-[52px] flex-1"
          onClick={onOpenNotifications}
        >
          Notifications
        </Button>
      )}

      {/* Primary destructive action */}
      <Button
        variant="primary"
        size="md"
        className="min-h-[52px] flex-1 bg-(--color-error) hover:bg-(--color-error)/90 shadow-none"
        isLoading={isStopping}
        onClick={onStop}
        aria-label="Stop live session"
      >
        Stop session
      </Button>
    </div>
  );
}
