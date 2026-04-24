import { useNavigate } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import type { QualitySummary } from "./spot-types";

interface SpotSuccessViewProps {
  quality: QualitySummary;
  nganyaName: string | null;
  corroborationMinutes: number | null;
}

export default function SpotSuccessView({
  quality,
  nganyaName,
  corroborationMinutes,
}: SpotSuccessViewProps) {
  const navigate = useNavigate();

  return (
    <div className="page-container flex min-h-[60vh] max-w-xl flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-green-soft)] animate-scale-in">
        <CheckCircle className="h-10 w-10 text-[var(--color-success)]" />
      </div>
      <h2 className="text-h2 text-[var(--color-text-primary)]">
        Sighting posted
      </h2>
      <p className="mt-2 text-body text-[var(--color-text-secondary)]">
        You just boosted this signal for{" "}
        <strong>{nganyaName}</strong>.
      </p>
      <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 text-left">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
          Signal quality: {quality.level}
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {quality.reasons.join(" + ") ||
            "Fresh live verification posted"}
        </p>
        {corroborationMinutes !== null ? (
          <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
            Another fan had this sighting {corroborationMinutes}m
            ago.
          </p>
        ) : null}
      </div>
      <Button
        variant="primary"
        className="mt-6"
        onClick={() => navigate({ to: "/" })}
      >
        Back Home
      </Button>
    </div>
  );
}
