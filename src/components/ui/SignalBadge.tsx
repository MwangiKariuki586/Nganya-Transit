/**
 * SignalBadge — Displays signal strength for sightings (Fresh, Aging, Expired).
 * Replaces generic confidence badges with meaningful recency indicators.
 */

import { getSignalStyle, type SignalStrength } from "@/lib/signal-intelligence";

interface SignalBadgeProps {
  strength: SignalStrength;
  className?: string;
}

export default function SignalBadge({
  strength,
  className = "",
}: SignalBadgeProps) {
  const style = getSignalStyle(strength);
  const labels = {
    fresh: "Fresh",
    aging: "Aging",
    expired: "Expired",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] font-bold tracking-wide uppercase border ${className}`}
      style={{
        color: style.color,
        backgroundColor: style.bg,
        borderColor: style.border,
        boxShadow: strength === "fresh" ? style.glow : "none",
      }}
      title={`Signal: ${labels[strength]}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: style.color }}
      />
      {labels[strength]}
    </span>
  );
}
