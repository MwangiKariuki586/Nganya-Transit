import { TrendingUp, Users, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

interface SessionInsightsProps {
  session: any;
  className?: string;
}

interface Insights {
  duration: string;
  totalPings: number;
  avgSeatsLeft: number;
  distanceCovered: string;
}

export function SessionInsights({
  session,
  className = "",
}: SessionInsightsProps) {
  const [insights, setInsights] = useState<Insights>({
    duration: "0m",
    totalPings: 0,
    avgSeatsLeft: 0,
    distanceCovered: "0 km",
  });

  useEffect(() => {
    if (!session) return;

    const calculateInsights = () => {
      // Calculate duration
      const start = new Date(session.started_at).getTime();
      const end = session.ended_at
        ? new Date(session.ended_at).getTime()
        : Date.now();
      const durationMs = end - start;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      // Estimate total pings (every 15s)
      const totalPings = Math.floor(durationMs / 15000);

      // Average seats (placeholder - would need historical data)
      const avgSeatsLeft = session.seats_left || 0;

      // Distance covered (placeholder - would need position history)
      const distanceCovered = "0 km";

      setInsights({
        duration,
        totalPings,
        avgSeatsLeft,
        distanceCovered,
      });
    };

    calculateInsights();
    const intervalId = setInterval(calculateInsights, 30000); // Update every 30s

    return () => clearInterval(intervalId);
  }, [session]);

  const stats = [
    {
      icon: Clock,
      label: "Duration",
      value: insights.duration,
      color: "text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "Updates sent",
      value: insights.totalPings.toString(),
      color: "text-[var(--color-success)]",
    },
    {
      icon: Users,
      label: "Avg seats",
      value: insights.avgSeatsLeft.toString(),
      color: "text-[var(--color-cyan)]",
    },
    {
      icon: MapPin,
      label: "Distance",
      value: insights.distanceCovered,
      color: "text-[var(--color-text-secondary)]",
    },
  ];

  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 ${className}`}
    >
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
        Session Insights
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {stat.label}
                </span>
              </div>
              <div className={`text-lg font-semibold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
