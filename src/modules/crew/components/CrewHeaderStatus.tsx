import { formatDirectionLabel } from "@/lib/formatters";

interface CrewHeaderStatusProps {
  isLive: boolean;
  nganyaName: string;
  corridorName: string;
  direction: string;
}

export function CrewHeaderStatus({
  isLive,
  nganyaName,
  corridorName,
  direction,
}: CrewHeaderStatusProps) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 shadow-[var(--shadow-md)]">
      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
        <span
          className={`h-2 w-2 rounded-full ${
            isLive
              ? "bg-[var(--color-accent)] shadow-[var(--glow-accent-sm)] animate-pulse"
              : "bg-[var(--color-text-tertiary)]"
          }`}
        />
        {isLive ? "Live session active" : "Session offline"}
      </div>

      {/* Nganya + route */}
      <div className="mt-2">
        <h1 className="text-h2 text-[var(--color-text-primary)] leading-tight">
          {nganyaName}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          {corridorName} &middot;{" "}
          {formatDirectionLabel(direction, corridorName) ?? direction}
        </p>
      </div>
    </div>
  );
}
