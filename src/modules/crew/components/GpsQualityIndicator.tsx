import { Satellite } from "lucide-react";
import { getGpsQuality } from "../lib/location-utils";

interface GpsQualityIndicatorProps {
  accuracy: number | null;
  className?: string;
}

export function GpsQualityIndicator({
  accuracy,
  className = "",
}: GpsQualityIndicatorProps) {
  const quality = getGpsQuality(accuracy);

  if (!quality) {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] ${className}`}
      >
        <Satellite className="h-3.5 w-3.5" />
        <span>No GPS</span>
      </div>
    );
  }

  const config = {
    excellent: {
      color: "text-[var(--color-success)]",
      bgColor: "bg-[var(--glass-bg)]",
      label: "Excellent",
      bars: 4,
    },
    good: {
      color: "text-[var(--color-success)]",
      bgColor: "bg-[var(--glass-bg)]",
      label: "Good",
      bars: 3,
    },
    fair: {
      color: "text-[var(--color-warning)]",
      bgColor: "bg-[var(--glass-bg)]",
      label: "Fair",
      bars: 2,
    },
    poor: {
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      label: "Poor",
      bars: 1,
    },
  };

  const { color, bgColor, label, bars } = config[quality];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 rounded-full transition-all ${
              bar <= bars ? bgColor : "bg-[var(--color-line)]"
            }`}
            style={{ height: `${bar * 3 + 4}px` }}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${color}`}>
        {label} ({accuracy?.toFixed(0)}m)
      </span>
    </div>
  );
}
