import { ShieldAlert, AlertTriangle } from "lucide-react";
import type { SpoofingCheck } from "../lib/spoofing-detection";

interface SpoofingWarningProps {
  check: SpoofingCheck;
  onAcknowledge?: () => void;
  className?: string;
}

export function SpoofingWarning({
  check,
  onAcknowledge,
  className = "",
}: SpoofingWarningProps) {
  if (!check.isSuspicious) return null;

  const config = {
    high: {
      icon: ShieldAlert,
      color: "red",
      title: "GPS Anomaly Detected",
      description:
        "Suspicious location data detected. Your session may be flagged for review.",
    },
    medium: {
      icon: AlertTriangle,
      color: "amber",
      title: "GPS Warning",
      description:
        "Unusual location patterns detected. Please ensure GPS is working correctly.",
    },
    low: {
      icon: AlertTriangle,
      color: "yellow",
      title: "GPS Notice",
      description: "Minor GPS inconsistencies detected.",
    },
  };

  const { icon: Icon, color, title, description } = config[check.severity];

  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-${color}-500/30 bg-${color}-500/10 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 text-${color}-400 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold text-${color}-200`}>{title}</h3>
          <p className={`mt-1 text-sm text-${color}-200/80`}>{description}</p>

          {check.reasons.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className={`text-xs font-semibold text-${color}-200/70`}>
                Issues detected:
              </div>
              <ul
                className={`text-xs text-${color}-200/70 space-y-0.5 list-disc list-inside`}
              >
                {check.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {check.severity === "high" && (
            <div
              className={`mt-3 p-2 rounded-md bg-${color}-500/20 border border-${color}-500/30`}
            >
              <p className={`text-xs text-${color}-200`}>
                <strong>Action Required:</strong> This session will be reviewed
                by administrators. Repeated violations may result in account
                suspension.
              </p>
            </div>
          )}

          {onAcknowledge && (
            <button
              type="button"
              onClick={onAcknowledge}
              className={`mt-3 text-xs text-${color}-200 hover:text-${color}-100 underline`}
            >
              I understand
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
