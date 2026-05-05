import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Radio, History, User, Shield, ArrowRight, Clock } from "lucide-react";
import { crewLiveService } from "@/features/crew-live/services/crew-live-service";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { getCrewStatusState } from "@/modules/crew/services/route-access";
import { useAuthSession } from "@/hooks/useAuthSession";
import { formatRelativeTime, formatDirectionLabel } from "@/lib/formatters";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function CrewHomeScreen() {
  const { snapshot } = useCrewBootstrap();
  const { profile } = useAuthSession();
  const crewState = getCrewStatusState(snapshot);

  const assignment = snapshot.bootstrap.assignment;
  const activeSession = snapshot.bootstrap.active_session;
  const isLive = crewState === "LIVE_ACTIVE";

  const [lastSession, setLastSession] = useState<any | null>(null);

  useEffect(() => {
    crewLiveService
      .listHistory(1)
      .then((data) => setLastSession(data?.[0] ?? null))
      .catch(() => {});
  }, []);

  const showRegister =
    crewState === "UNREGISTERED" ||
    crewState === "NEEDS_INFO" ||
    crewState === "REJECTED" ||
    crewState === "PENDING_APPROVAL";

  const quickActions = [
    ...(isLive && activeSession
      ? [{ to: `/crew/session/${activeSession.id}`, icon: Radio, label: "Resume Live", accent: true }]
      : [{ to: "/crew/live", icon: Radio, label: "Go Live", accent: true }]),
    { to: "/crew/history", icon: History, label: "History", accent: false },
    { to: "/crew/profile", icon: User, label: "Profile", accent: false },
    ...(showRegister
      ? [{ to: "/crew/register", icon: Shield, label: "Register", accent: false }]
      : []),
  ];

  const corridorName = assignment?.terminal_label ?? "Unknown route";

  return (
    <div className="page-container max-w-2xl py-8 md:py-10 space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-tag text-[var(--color-accent)]">Crew Console</p>
        <h1 className="mt-2 text-h1 text-white">
          {getGreeting()}{profile?.handle ? `, ${profile.handle}` : ""}
        </h1>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">
          {isLive ? "You're currently broadcasting live." : "Ready to go live?"}
        </p>
      </div>

      {/* Active session banner */}
      {isLive && activeSession && (
        <div className="rounded-[24px] border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-5 shadow-[0_8px_32px_var(--theme-accent-subtle)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] shadow-[var(--glow-accent-sm)]">
                <Radio className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Live session in progress</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                  <Clock className="h-3 w-3" />
                  {formatElapsed(activeSession.started_at)} elapsed
                </div>
              </div>
            </div>
            <Link
              to="/crew/session/$id"
              params={{ id: activeSession.id }}
              className="inline-flex items-center gap-1.5 rounded-[14px] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-foreground)] no-underline shadow-[var(--glow-accent-sm)] hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Resume <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to as any}
            className={`flex items-center gap-3 rounded-[20px] border p-4 no-underline transition-all ${
              action.accent
                ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-[var(--color-accent)] hover:border-[var(--color-accent)]/50"
                : "border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-secondary)] hover:border-[var(--glass-border-hover)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <action.icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Assignment card */}
      {assignment && (
        <div className="rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-caption text-[var(--color-text-tertiary)]">Assigned nganya</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                assignment.is_verified
                  ? "border-[var(--glass-border)] text-[var(--color-success)]"
                  : "border-[var(--glass-border)] text-[var(--color-warning)]"
              }`}
            >
              {assignment.is_verified ? "Verified" : "Pending"}
            </span>
          </div>
          {assignment.media_thumb_url && (
            <div className="mb-3 h-32 w-full overflow-hidden rounded-[16px] border border-[var(--glass-border)]">
              <img
                src={assignment.media_thumb_url}
                alt={assignment.nganya_name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="text-base font-semibold text-white">{assignment.nganya_name}</div>
          <div className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{corridorName}</div>
        </div>
      )}

      {/* Last session */}
      {lastSession && (
        <div>
          <h2 className="mb-3 text-caption font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
            Last Session
          </h2>
          <div className="rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {lastSession.nganyas?.name || assignment?.nganya_name || "Nganya"}
                </div>
                <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  {lastSession.nganyas?.corridors?.name || corridorName}
                  {" · "}
                  {formatDirectionLabel(
                    lastSession.direction,
                    lastSession.nganyas?.corridors?.name,
                  ) ?? lastSession.direction}
                </div>
              </div>
              <div
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  lastSession.status === "LIVE"
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "bg-[var(--glass-bg-strong)] text-[var(--color-text-secondary)]"
                }`}
              >
                {lastSession.status}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
              <span>Started {formatRelativeTime(lastSession.started_at)}</span>
              <span>Duration {formatDuration(lastSession.started_at, lastSession.ended_at)}</span>
              <span>
                {lastSession.seats_left === 0
                  ? "Ended full"
                  : `${lastSession.seats_left} seats left`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
