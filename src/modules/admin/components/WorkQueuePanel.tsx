import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface QueueItem {
  id: string;
  description: string;
  severity: "info" | "warning" | "critical";
  cta: string;
  to: string;
}

interface WorkQueuePanelProps {
  items: QueueItem[];
  isLoading?: boolean;
}

const severityStyles = {
  info: "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
  warning: "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-warning)]",
  critical: "border-red-500/30 bg-red-500/10 text-red-200",
} as const;

export function WorkQueuePanel({ items, isLoading }: WorkQueuePanelProps) {
  if (isLoading) {
    return (
      <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
        <h2 className="text-h3 text-white">Work queue</h2>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[18px] bg-[rgba(10,10,15,0.55)]"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-[var(--color-accent)]" />
        <h2 className="text-h3 text-white">Work queue</h2>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--color-success)]" />
          <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
            All clear
          </div>
          <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
            No urgent items need attention
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4"
            >
              <span
                className={`shrink-0 rounded-[999px] border px-2.5 py-1 text-caption ${severityStyles[item.severity]}`}
              >
                {item.severity === "critical"
                  ? "Urgent"
                  : item.severity === "warning"
                    ? "Attention"
                    : "Info"}
              </span>
              <div className="min-w-0 flex-1 text-sm text-[var(--color-text-secondary)]">
                {item.description}
              </div>
              <Link
                to={item.to}
                className="shrink-0 rounded-[14px] border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 text-caption font-semibold text-[var(--color-accent)] no-underline transition-all hover:bg-[var(--color-accent)]/20"
              >
                {item.cta}
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
