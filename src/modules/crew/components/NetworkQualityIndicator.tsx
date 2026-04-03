import { Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

interface NetworkQualityIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function NetworkQualityIndicator({
  className = "",
  showDetails = false,
}: NetworkQualityIndicatorProps) {
  const { status, isOnline, effectiveType, downlink, rtt } = useNetworkStatus();

  const config = {
    healthy: {
      icon: Wifi,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
      label: "Online",
    },
    poor: {
      icon: Wifi,
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      label: "Slow",
    },
    offline: {
      icon: WifiOff,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      label: "Offline",
    },
  };

  const { icon: Icon, color, bgColor, label } = config[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bgColor}`}
      >
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`text-xs font-medium ${color}`}>{label}</span>
      </div>

      {showDetails && isOnline && effectiveType && (
        <div className="text-xs text-[var(--color-text-tertiary)]">
          {effectiveType.toUpperCase()}
          {downlink && ` • ${downlink.toFixed(1)} Mbps`}
          {rtt && ` • ${rtt}ms`}
        </div>
      )}
    </div>
  );
}
