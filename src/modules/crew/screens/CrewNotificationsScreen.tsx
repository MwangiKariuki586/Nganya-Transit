import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Info, Shield, AlertCircle, Settings, MessageSquare } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { formatRelativeTime } from "@/lib/formatters";
import {
  getCrewNotificationsServerFn,
  markNotificationReadServerFn,
  markAllNotificationsReadServerFn,
} from "@/shared/server-fns/crew-notifications";
import InlineSpinner from "@/components/ui/InlineSpinner";

type NotificationType =
  | "registration_approved"
  | "registration_rejected"
  | "registration_needs_info"
  | "assignment_changed"
  | "admin_message";

interface CrewNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  registration_approved: Check,
  registration_rejected: AlertCircle,
  registration_needs_info: Info,
  assignment_changed: Settings,
  admin_message: MessageSquare,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  registration_approved: "text-[var(--color-success)]",
  registration_rejected: "text-[var(--color-error)]",
  registration_needs_info: "text-[var(--color-warning)]",
  assignment_changed: "text-[var(--color-cyan)]",
  admin_message: "text-[var(--color-text-secondary)]",
};

export default function CrewNotificationsScreen() {
  const { session } = useAuthSession();
  const [notifications, setNotifications] = useState<CrewNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const accessToken = session?.access_token ?? "";

  async function loadNotifications() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getCrewNotificationsServerFn({ data: { accessToken } });
      setNotifications(data || []);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) void loadNotifications();
  }, [accessToken]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    try {
      await markNotificationReadServerFn({ data: { accessToken, id } });
    } catch {
      /* silent — optimistic update */
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsReadServerFn({ data: { accessToken } });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      );
    } catch (err: any) {
      setLoadError(err?.message || "Failed to mark all as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="page-container max-w-2xl py-8 md:py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-tag text-[var(--color-accent)]">Crew</p>
          <h1 className="mt-2 text-h1 text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-body-sm text-[var(--color-text-secondary)]">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && !isLoading && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={isMarkingAll}
            className="mt-2 inline-flex items-center gap-1.5 rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:border-[var(--glass-border-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
          >
            {isMarkingAll ? <InlineSpinner /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--color-text-secondary)]">Loading...</div>
      ) : loadError ? (
        <div className="rounded-[18px] border border-[var(--color-error)]/20 bg-[var(--glass-bg)] p-4 text-sm text-[var(--color-error)]">
          {loadError}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-bg)] py-12 text-center">
          <Bell className="h-8 w-8 text-[var(--color-text-tertiary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = TYPE_ICON[notification.type] ?? Bell;
            const colorClass = TYPE_COLOR[notification.type] ?? "text-[var(--color-text-secondary)]";
            const isUnread = !notification.read_at;

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => isUnread && void handleMarkRead(notification.id)}
                className={`w-full rounded-[20px] border p-4 text-left transition-all ${
                  isUnread
                    ? "border-[var(--glass-border-hover)] bg-[var(--glass-bg-strong)] cursor-pointer hover:border-[var(--color-accent)]/30"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg)] cursor-default opacity-70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] ${colorClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {notification.title}
                      </span>
                      {isUnread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
