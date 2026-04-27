import { Zap, Activity, Turtle, Pause, Battery } from "lucide-react";
import type { PingMode } from "../hooks/useAdaptivePing";

interface AdaptivePingIndicatorProps {
  mode: PingMode;
  interval: number;
  speed: number | null;
  batteryLevel: number | null;
  className?: string;
}

export function AdaptivePingIndicator({
  mode,
  interval,
  speed,
  batteryLevel,
  className = "",
}: AdaptivePingIndicatorProps) {
  const config = {
    fast: {
      icon: Zap,
      color: "text-[var(--color-success)]",
      bgColor: "bg-[var(--glass-bg)]",
      label: "Fast",
      description: "High-frequency updates",
    },
    normal: {
      icon: Activity,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      label: "Normal",
      description: "Standard updates",
    },
    slow: {
      icon: Turtle,
      color: "text-[var(--color-warning)]",
      bgColor: "bg-[var(--glass-bg)]",
      label: "Slow",
      description: "Reduced frequency",
    },
    stationary: {
      icon: Pause,
      color: "text-gray-400",
      bgColor: "bg-gray-500/20",
      label: "Stationary",
      description: "Minimal updates",
    },
  };

  const { icon: Icon, color, bgColor, label, description } = config[mode];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bgColor}`}
      >
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`text-xs font-medium ${color}`}>{label}</span>
      </div>

      <div className="text-xs text-[var(--color-text-tertiary)]">
        {(interval / 1000).toFixed(0)}s
        {speed !== null && ` • ${speed.toFixed(0)} km/h`}
      </div>

      {batteryLevel !== null && batteryLevel < 20 && (
        <div className="flex items-center gap-1 text-xs text-[var(--color-warning)]">
          <Battery className="h-3 w-3" />
          <span>{batteryLevel.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
