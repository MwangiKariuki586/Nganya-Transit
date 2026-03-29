import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

interface AlertCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  severity?: "ok" | "info" | "warning" | "critical";
  to?: string;
  isLoading?: boolean;
}

const severityStyles = {
  ok: "border-emerald-500/30 bg-emerald-500/10",
  info: "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10",
  warning: "border-amber-500/30 bg-amber-500/10",
  critical: "border-red-500/30 bg-red-500/10",
} as const;

const iconStyles = {
  ok: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  info: "text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20",
  warning: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  critical: "text-red-300 bg-red-500/10 border-red-500/20",
} as const;

export function AlertCard({
  label,
  value,
  helper,
  icon,
  severity = "info",
  to,
  isLoading,
}: AlertCardProps) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-caption text-[var(--color-text-tertiary)]">
          {label}
        </div>
        <div className="mt-2 text-h2 text-white">
          {isLoading ? "..." : value}
        </div>
        {helper && (
          <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
            {helper}
          </div>
        )}
      </div>
      {icon && (
        <div
          className={`rounded-[18px] border px-3 py-2 ${iconStyles[severity]}`}
        >
          {icon}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`block rounded-[24px] border p-5 shadow-[var(--shadow-md)] no-underline transition-all hover:shadow-[var(--glow-accent-sm)] ${severityStyles[severity]}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <section
      className={`rounded-[24px] border p-5 shadow-[var(--shadow-md)] ${severityStyles[severity]}`}
    >
      {content}
    </section>
  );
}
