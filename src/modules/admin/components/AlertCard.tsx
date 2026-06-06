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
  ok: "border-[var(--glass-border)] bg-[var(--glass-bg)]",
  info: "border-[var(--glass-border)] bg-[var(--glass-bg)]",
  warning: "border-[var(--glass-border)] bg-[var(--glass-bg)]",
  critical: "border-[var(--glass-border)] bg-[var(--glass-bg)]",
} as const;

const iconStyles = {
  ok: "text-[var(--color-success)] bg-transparent border-[var(--glass-border)]",
  info: "text-[var(--color-accent)] bg-transparent border-[var(--glass-border)]",
  warning: "text-[var(--color-warning)] bg-transparent border-[var(--glass-border)]",
  critical: "text-[var(--color-error)] bg-transparent border-[var(--glass-border)]",
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
