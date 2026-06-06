import { TrendingUp, Users, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface SessionInsightsProps {
  session: any;
  className?: string;
}

interface Insights {
  duration: string;
  totalPings: number;
  currentSeats: number;
}

export function SessionInsights({
  session,
  className = "",
}: SessionInsightsProps) {
  const [insights, setInsights] = useState<Insights>({
    duration: "0m",
    totalPings: 0,
    currentSeats: 0,
  });

  useEffect(() => {
    if (!session) return;

    const calculateInsights = () => {
      const start = new Date(session.started_at).getTime();
      const end = session.ended_at
        ? new Date(session.ended_at).getTime()
        : Date.now();
      const durationMs = end - start;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      // Estimate total pings from session duration (approx every 15 s)
      const totalPings = Math.floor(durationMs / 15000);

      setInsights({
        duration,
        totalPings,
        currentSeats: session.seats_left ?? 0,
      });
    };

    calculateInsights();
    const intervalId = setInterval(calculateInsights, 30000);
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
      label: "Current seats",
      value:
        insights.currentSeats === 0 ? "Full" : insights.currentSeats.toString(),
      color: "text-[var(--color-cyan)]",
    },
  ];

  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 ${className}`}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        Session metrics
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] p-3"
            >
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${stat.color}`} />
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {stat.label}
                </span>
              </div>
              <div className={`text-base font-semibold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
