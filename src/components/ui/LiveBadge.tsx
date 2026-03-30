/**
 * LiveBadge — Pulsing LIVE NOW indicator.
 * Shows a pulsing dot + text. Respects prefers-reduced-motion
 * via the animate-live-pulse class defined in styles.css.
 */

interface LiveBadgeProps {
  className?: string;
  compact?: boolean;
}

export default function LiveBadge({
  className = "",
  compact = false,
}: LiveBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label="Live now"
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-live-pulse absolute inset-0 rounded-full bg-[var(--color-live)] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-live)]" />
      </span>
      {!compact && (
        <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-live)]">
          Live Now
        </span>
      )}
    </span>
  );
}
