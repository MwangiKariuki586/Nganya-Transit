/**
 * CredibilityBadge — Displays user credibility level based on activity.
 */

import {
  getCredibilityStyle,
  type CredibilityLevel,
} from "@/lib/signal-intelligence";

interface CredibilityBadgeProps {
  level: CredibilityLevel;
  label: string;
  className?: string;
}

export default function CredibilityBadge({
  level,
  label,
  className = "",
}: CredibilityBadgeProps) {
  const style = getCredibilityStyle(level);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-semibold border ${className}`}
      style={{
        color: style.color,
        backgroundColor: style.bg,
        borderColor: style.border,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: style.color }}
      />
      {label}
    </span>
  );
}
