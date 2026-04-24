import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastContainer";
import { InlineErrorState } from "@/components/error/InlineErrorState";
import { useAdminStore } from "@/stores/useAdminStore";
import { TableSkeleton, InlineTableLoader } from "@/components/ui/loading";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  formatTimeAgo,
  formatShortId,
  getLiveHealthTone,
} from "@/lib/admin-utils";
import { RadioTower, WifiOff } from "lucide-react";

type HealthFilter = "all" | "healthy" | "warning" | "stale";

export default function AdminLiveSessionsScreen() {
  const { addToast, showErrorToast } = useToast();
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [search, setSearch] = useState("");
  const [isRefetching, setIsRefetching] = useState(false);
  const [terminatingSessionId, setTerminatingSessionId] = useState<
    string | null
  >(null);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState<{
    sessionId: string;
    crewName: string;
  } | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [viewingSession, setViewingSession] = useState<any | null>(null);

  const {
    crewManagement,
    isLoadingCrewManagement,
    crewManagementError,
    fetchCrewManagement,
    terminateSession,
  } = useAdminStore();

  const crewRows = crewManagement?.crewRows || [];
  const isLoading = isLoadingCrewManagement;
  const error = crewManagementError;

  useEffect(() => {
    void fetchCrewManagement();
  }, [fetchCrewManagement]);

  // Show full skeleton on initial load (no data yet)
  if (isLoading && !crewManagement) {
    return (
      <div className="page-container py-8 md:py-10">
        <div className="mb-6">
          <div className="text-tag text-[var(--color-accent)]">
            Live monitoring
          </div>
          <h1 className="text-h2 mt-1 text-white">Active sessions</h1>
        </div>
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <TableSkeleton rows={8} columns={7} />
        </section>
      </div>
    );
  }

  if (error && !crewManagement && !isLoading) {
    return (
      <div className="page-container py-8 md:py-10">
        <div className="mb-6">
          <div className="text-tag text-[var(--color-accent)]">
            Live monitoring
          </div>
          <h1 className="text-h2 mt-1 text-white">Active sessions</h1>
        </div>
        <InlineErrorState
          title="Live session monitoring failed to load"
          message="Session health data could not be loaded."
          onRetry={() => {
            void fetchCrewManagement();
          }}
        />
      </div>
    );
  }

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let filtered = crewRows.filter((crew: any) => crew.activeSessionId);

    // Health filter
    if (healthFilter !== "all") {
      filtered = filtered.filter((crew: any) => {
        const health = getLiveHealthTone(crew.activeSessionLastPingAt);
        if (healthFilter === "healthy") return health === "green";
        if (healthFilter === "warning") return health === "amber";
        if (healthFilter === "stale") return health === "red";
        return true;
      });
    }

    // Search filter
    if (needle) {
      filtered = filtered.filter((crew: any) => {
        const haystack = [
          crew.handle,
          crew.email,
          crew.assignedNganyaName,
          crew.assignedCorridorName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    // Sort by last ping (most recent first)
    return [...filtered].sort(
      (a: any, b: any) =>
        new Date(b.activeSessionLastPingAt || 0).getTime() -
        new Date(a.activeSessionLastPingAt || 0).getTime(),
    );
  }, [crewRows, healthFilter, search]);

  // Health counts
  const healthCounts = useMemo(() => {
    const sessions = crewRows.filter((crew: any) => crew.activeSessionId);
    return {
      all: sessions.length,
      healthy: sessions.filter(
        (crew: any) =>
          getLiveHealthTone(crew.activeSessionLastPingAt) === "green",
      ).length,
      warning: sessions.filter(
        (crew: any) =>
          getLiveHealthTone(crew.activeSessionLastPingAt) === "amber",
      ).length,
      stale: sessions.filter(
        (crew: any) =>
          getLiveHealthTone(crew.activeSessionLastPingAt) === "red",
      ).length,
    };
  }, [crewRows]);

  const handleRefresh = async () => {
    setIsRefetching(true);
    try {
      await fetchCrewManagement();
    } finally {
      setIsRefetching(false);
    }
  };

  const handleTerminate = async () => {
    if (!showTerminateConfirm) return;

    setTerminatingSessionId(showTerminateConfirm.sessionId);

    try {
      await terminateSession(
        showTerminateConfirm.sessionId,
        terminationReason || "Admin terminated stale session",
      );
      addToast("Session terminated successfully.", "success");
      setShowTerminateConfirm(null);
      setTerminationReason("");

      // Refresh data
      await fetchCrewManagement();
    } catch (error: any) {
      showErrorToast(error, "Failed to terminate session.");
    } finally {
      setTerminatingSessionId(null);
    }
  };

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">
            Live monitoring
          </div>
          <h1 className="text-h2 mt-1 text-white">Active sessions</h1>
          <p className="text-body mt-2 text-[var(--color-text-secondary)]">
            Monitor all live crew sessions in real-time with health indicators
            and ping status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            Active:{" "}
            <span className="font-semibold text-white">{healthCounts.all}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={isRefetching}
            className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm font-semibold text-white transition-all hover:border-[var(--color-accent)] disabled:opacity-50"
          >
            {isRefetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
        {/* Health filter tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: "All" },
              { key: "healthy", label: "Healthy" },
              { key: "warning", label: "Warning" },
              { key: "stale", label: "Stale" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setHealthFilter(tab.key)}
              className={`rounded-[16px] border px-3 py-2 text-sm font-semibold transition-all ${
                healthFilter === tab.key
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)] hover:border-[var(--glass-border-hover)]"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-70">{healthCounts[tab.key]}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search crew, nganya, corridor..."
            className="w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>

        {/* Inline refetch loader */}
        {isRefetching && (
          <div className="mb-4">
            <InlineTableLoader />
          </div>
        )}

        {/* Sessions table */}
        {isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-12 text-center">
            <WifiOff className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)]" />
            <div className="mt-3 text-body text-[var(--color-text-secondary)]">
              {healthFilter === "all"
                ? "No active live sessions"
                : `No ${healthFilter} sessions`}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--glass-border)]">
                  <th className="px-3 py-3 text-left text-caption text-[var(--color-text-tertiary)]">
                    Health
                  </th>
                  <th className="px-3 py-3 text-left text-caption text-[var(--color-text-tertiary)]">
                    Crew
                  </th>
                  <th className="px-3 py-3 text-left text-caption text-[var(--color-text-tertiary)]">
                    Nganya
                  </th>
                  <th className="px-3 py-3 text-left text-caption text-[var(--color-text-tertiary)]">
                    Route
                  </th>
                  <th className="px-3 py-3 text-left text-caption text-[var(--color-text-tertiary)]">
                    Last ping
                  </th>
                  <th className="px-3 py-3 text-left text-caption text-[var(--color-text-tertiary)]">
                    Session started
                  </th>
                  <th className="px-3 py-3 text-left text-caption text-[var(--color-text-tertiary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((crew: any) => {
                  const health = getLiveHealthTone(
                    crew.activeSessionLastPingAt,
                  );
                  const healthLabel =
                    health === "green"
                      ? "Healthy"
                      : health === "amber"
                        ? "Warning"
                        : "Stale";
                  const healthColor =
                    health === "green"
                      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                      : health === "amber"
                        ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                        : "text-red-300 bg-red-500/10 border-red-500/20";

                  return (
                    <tr
                      key={crew.id}
                      className="border-b border-[var(--glass-border)]/50 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-[999px] border px-2.5 py-1 text-caption ${healthColor}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              health === "green"
                                ? "bg-emerald-400"
                                : health === "amber"
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            }`}
                          />
                          {healthLabel}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-white">
                          {crew.handle || crew.email || "Unknown"}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-caption text-[var(--color-text-tertiary)]">
                          <CopyButton text={crew.id} label="ID" />
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          {crew.assignedNganyaName || (
                            <span className="italic text-[var(--color-text-tertiary)]">
                              Unassigned
                            </span>
                          )}
                        </div>
                        {crew.assignmentVerified && (
                          <div className="mt-1 text-caption text-emerald-300">
                            ✓ Verified
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-[var(--color-text-secondary)]">
                        {crew.assignedCorridorName || "—"}
                      </td>
                      <td className="px-3 py-4">
                        <div
                          className="text-sm text-white"
                          title={new Date(
                            crew.activeSessionLastPingAt,
                          ).toLocaleString()}
                        >
                          {formatTimeAgo(crew.activeSessionLastPingAt)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div
                          className="text-sm text-[var(--color-text-secondary)]"
                          title={new Date(
                            crew.activeSessionStartedAt,
                          ).toLocaleString()}
                        >
                          {formatTimeAgo(crew.activeSessionStartedAt)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingSession(crew)}
                            className="rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setShowTerminateConfirm({
                                sessionId: crew.activeSessionId,
                                crewName:
                                  crew.handle || crew.email || "Unknown",
                              })
                            }
                            disabled={
                              terminatingSessionId === crew.activeSessionId
                            }
                            className="rounded-[14px] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition-all hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {terminatingSessionId === crew.activeSessionId
                              ? "Terminating..."
                              : "Terminate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {!isLoading && filteredSessions.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--glass-border)] pt-4 text-caption text-[var(--color-text-tertiary)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Healthy (&lt;30s)
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Warning (30-90s)
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              Stale (&gt;90s)
            </div>
          </div>
        )}
      </section>

      {/* Stats summary */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-3">
            <RadioTower className="h-6 w-6 text-emerald-300" />
            <div>
              <div className="text-caption text-emerald-300/70">
                Healthy sessions
              </div>
              <div className="mt-1 text-h3 text-emerald-200">
                {healthCounts.healthy}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex items-center gap-3">
            <RadioTower className="h-6 w-6 text-amber-300" />
            <div>
              <div className="text-caption text-amber-300/70">
                Warning sessions
              </div>
              <div className="mt-1 text-h3 text-amber-200">
                {healthCounts.warning}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-5">
          <div className="flex items-center gap-3">
            <WifiOff className="h-6 w-6 text-red-300" />
            <div>
              <div className="text-caption text-red-300/70">Stale sessions</div>
              <div className="mt-1 text-h3 text-red-200">
                {healthCounts.stale}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View session details modal */}
      {viewingSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setViewingSession(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.98)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-h4 text-white">Session details</h3>
                <p className="mt-1 text-body-sm text-[var(--color-text-secondary)]">
                  {viewingSession.handle ||
                    viewingSession.email ||
                    "Unknown crew"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSession(null)}
                className="rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--glass-border-hover)] hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
                <div className="text-caption text-[var(--color-text-tertiary)]">
                  Session info
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Session ID:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">
                        {formatShortId(viewingSession.activeSessionId)}
                      </span>
                      <CopyButton text={viewingSession.activeSessionId} />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Started:
                    </span>
                    <span className="text-white">
                      {formatTimeAgo(viewingSession.activeSessionStartedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Last ping:
                    </span>
                    <span className="text-white">
                      {formatTimeAgo(viewingSession.activeSessionLastPingAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Health:
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-[999px] border px-2.5 py-1 text-caption ${
                        getLiveHealthTone(
                          viewingSession.activeSessionLastPingAt,
                        ) === "green"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : getLiveHealthTone(
                                viewingSession.activeSessionLastPingAt,
                              ) === "amber"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                            : "border-red-500/30 bg-red-500/10 text-red-200"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          getLiveHealthTone(
                            viewingSession.activeSessionLastPingAt,
                          ) === "green"
                            ? "bg-emerald-400"
                            : getLiveHealthTone(
                                  viewingSession.activeSessionLastPingAt,
                                ) === "amber"
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                      />
                      {getLiveHealthTone(
                        viewingSession.activeSessionLastPingAt,
                      ) === "green"
                        ? "Healthy"
                        : getLiveHealthTone(
                              viewingSession.activeSessionLastPingAt,
                            ) === "amber"
                          ? "Warning"
                          : "Stale"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
                <div className="text-caption text-[var(--color-text-tertiary)]">
                  Assignment
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Nganya:
                    </span>
                    <span className="text-white">
                      {viewingSession.assignedNganyaName || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Route:
                    </span>
                    <span className="text-white">
                      {viewingSession.assignedCorridorName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Verified:
                    </span>
                    <span className="text-white">
                      {viewingSession.assignmentVerified ? "✓ Yes" : "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      Crew ID:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">
                        {formatShortId(viewingSession.id)}
                      </span>
                      <CopyButton text={viewingSession.id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setViewingSession(null);
                  setShowTerminateConfirm({
                    sessionId: viewingSession.activeSessionId,
                    crewName:
                      viewingSession.handle ||
                      viewingSession.email ||
                      "Unknown",
                  });
                }}
                className="rounded-[18px] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition-all hover:border-red-500/50 hover:bg-red-500/20"
              >
                Terminate session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate confirmation modal */}
      {showTerminateConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => !terminatingSessionId && setShowTerminateConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-red-500/30 bg-[rgba(23,23,31,0.98)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-h4 text-white">Terminate live session</h3>
            <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
              This will immediately end the live session for{" "}
              <span className="font-semibold text-white">
                {showTerminateConfirm.crewName}
              </span>
              . The crew member will be logged out and need to start a new
              session.
            </p>

            <div className="mt-4">
              <label htmlFor="termination-reason" className="text-caption text-[var(--color-text-tertiary)]">
                Reason (optional)
              </label>
              <input
                id="termination-reason"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="e.g., Stale session, duplicate session..."
                disabled={!!terminatingSessionId}
                className="mt-2 w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleTerminate();
                }}
                disabled={!!terminatingSessionId}
                className="flex-1 rounded-[18px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition-all hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
              >
                {terminatingSessionId ? "Terminating..." : "Confirm terminate"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTerminateConfirm(null);
                  setTerminationReason("");
                }}
                disabled={!!terminatingSessionId}
                className="flex-1 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-3 text-sm font-semibold text-white transition-all hover:border-[var(--glass-border-hover)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
