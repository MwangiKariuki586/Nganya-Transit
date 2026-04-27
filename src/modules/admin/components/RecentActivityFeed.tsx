import { Clock } from "lucide-react";
import { formatTimeAgo } from "@/lib/admin-utils";

interface ActivityItem {
  id: string;
  type: "registration" | "crew_assignment" | "role_update";
  description: string;
  timestamp: string;
}

interface RecentActivityFeedProps {
  items: ActivityItem[];
  isLoading?: boolean;
}

const typeStyles = {
  registration: "text-[var(--color-accent)]",
  crew_assignment: "text-[var(--color-success)]",
  role_update: "text-cyan-300",
} as const;

export function RecentActivityFeed({
  items,
  isLoading,
}: RecentActivityFeedProps) {
  if (isLoading) {
    return (
      <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
        <h2 className="text-h3 text-white">Recent activity</h2>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-[14px] bg-[rgba(10,10,15,0.55)]"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-[var(--color-accent)]" />
        <h2 className="text-h3 text-white">Recent activity</h2>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-6 text-center">
          <div className="text-body-sm text-[var(--color-text-secondary)]">
            No recent activity
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-3"
            >
              <div
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${typeStyles[item.type]}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[var(--color-text-primary)]">
                  {item.description}
                </div>
                <div
                  className="mt-1 text-caption text-[var(--color-text-tertiary)]"
                  title={new Date(item.timestamp).toLocaleString()}
                >
                  {formatTimeAgo(item.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
