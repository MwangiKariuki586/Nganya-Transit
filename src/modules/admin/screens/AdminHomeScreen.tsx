import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, RadioTower, ShieldAlert, UserCog } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { AlertCard } from "@/modules/admin/components/AlertCard";
import { WorkQueuePanel } from "@/modules/admin/components/WorkQueuePanel";
import { RecentActivityFeed } from "@/modules/admin/components/RecentActivityFeed";
import { MiniTable } from "@/modules/admin/components/MiniTable";
import { useAdminStore } from "@/stores/useAdminStore";
import {
  formatTimeAgo,
  formatShortId,
  getLiveHealthTone,
} from "@/lib/admin-utils";

export default function AdminHomeScreen() {
  const { addToast } = useToast();
  const overview = useAdminStore((state) => state.overview);
  const registrations = useAdminStore((state) => state.registrations);
  const crewManagement = useAdminStore((state) => state.crewManagement);
  const users = useAdminStore((state) => state.users);
  const isLoadingOverview = useAdminStore((state) => state.isLoadingOverview);
  const overviewError = useAdminStore((state) => state.overviewError);
  const fetchOverviewDeep = useAdminStore((state) => state.fetchOverviewDeep);

  useEffect(() => {
    fetchOverviewDeep();
  }, [fetchOverviewDeep]);

  useEffect(() => {
    if (!overviewError) return;
    addToast(
      overviewError.message || "Failed to load admin overview.",
      "error",
    );
  }, [addToast, overviewError]);

  // Compute work queue items
  const workQueue = useMemo(() => {
    if (!overview) return [];

    const items = [];

    if (overview.pendingRegistrations > 0) {
      items.push({
        id: "pending-registrations",
        description: `${overview.pendingRegistrations} registration${overview.pendingRegistrations === 1 ? "" : "s"} need review`,
        severity:
          overview.pendingRegistrations > 5
            ? ("warning" as const)
            : ("info" as const),
        cta: "Review",
        to: "/admin/registrations",
      });
    }

    if (overview.needsInfoRegistrations > 0) {
      items.push({
        id: "needs-info-registrations",
        description: `${overview.needsInfoRegistrations} registration${overview.needsInfoRegistrations === 1 ? "" : "s"} waiting for crew response`,
        severity: "info" as const,
        cta: "View",
        to: "/admin/registrations",
      });
    }

    if (overview.staleLiveSessions > 0) {
      items.push({
        id: "stale-sessions",
        description: `${overview.staleLiveSessions} live session${overview.staleLiveSessions === 1 ? "" : "s"} stale (last ping >90s)`,
        severity: "warning" as const,
        cta: "Investigate",
        to: "/admin/live",
      });
    }

    if (overview.crewWithoutAssignment > 0) {
      items.push({
        id: "unassigned-crew",
        description: `${overview.crewWithoutAssignment} crew member${overview.crewWithoutAssignment === 1 ? "" : "s"} unassigned`,
        severity: "info" as const,
        cta: "Assign",
        to: "/admin/crew",
      });
    }

    if (overview.roleMismatches > 0) {
      items.push({
        id: "role-mismatches",
        description: `${overview.roleMismatches} role mismatch${overview.roleMismatches === 1 ? "" : "es"} detected`,
        severity:
          overview.roleMismatches > 3
            ? ("warning" as const)
            : ("info" as const),
        cta: "Fix roles",
        to: "/admin/users",
      });
    }

    return items.slice(0, 5);
  }, [overview]);

  // Compute recent activity from latest updates
  const recentActivity = useMemo(() => {
    if (!registrations || !crewManagement) return [];

    const activities = [];

    // Latest registration updates
    const sortedRegs = [...registrations]
      .filter((r) => r.status !== "PENDING")
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      )
      .slice(0, 3);

    for (const reg of sortedRegs) {
      const action =
        reg.status === "APPROVED"
          ? "Approved"
          : reg.status === "REJECTED"
            ? "Rejected"
            : "Requested changes for";
      activities.push({
        id: `reg-${reg.id}`,
        type: "registration" as const,
        description: `${action} ${reg.proposed_name} (${reg.corridors?.name || "Unknown"})`,
        timestamp: reg.updated_at || reg.created_at,
      });
    }

    // Latest crew assignments (those with assignments)
    const assignedCrew = (crewManagement?.crewRows || [])
      .filter((c: any) => c.assignedNganyaId)
      .sort(
        (a: any, b: any) =>
          new Date(b.latestRequestUpdatedAt || 0).getTime() -
          new Date(a.latestRequestUpdatedAt || 0).getTime(),
      )
      .slice(0, 3);

    for (const crew of assignedCrew) {
      if (crew.latestRequestUpdatedAt) {
        activities.push({
          id: `crew-${crew.id}`,
          type: "crew_assignment" as const,
          description: `Mapped ${crew.handle || crew.email || formatShortId(crew.id)} → ${crew.assignedNganyaName}`,
          timestamp: crew.latestRequestUpdatedAt,
        });
      }
    }

    // Sort all by timestamp and take top 10
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);
  }, [registrations, crewManagement]);

  // Mini table: Live sessions
  const liveSessionsRows = useMemo(() => {
    if (!crewManagement?.crewRows) return [];

    return (crewManagement.crewRows as any[])
      .filter((crew) => crew.activeSessionId)
      .sort(
        (a, b) =>
          new Date(b.activeSessionLastPingAt || 0).getTime() -
          new Date(a.activeSessionLastPingAt || 0).getTime(),
      )
      .slice(0, 5)
      .map((crew) => {
        const health = getLiveHealthTone(crew.activeSessionLastPingAt);
        const healthDot = (
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              health === "green"
                ? "bg-emerald-400"
                : health === "amber"
                  ? "bg-amber-400"
                  : "bg-red-400"
            }`}
          />
        );

        return {
          id: crew.id,
          cells: [
            <span key="name" className="font-medium text-white">
              {crew.assignedNganyaName || "Unassigned"}
            </span>,
            crew.assignedCorridorName || "—",
            <span key="health" className="flex items-center gap-2">
              {healthDot}
              <span
                title={new Date(crew.activeSessionLastPingAt).toLocaleString()}
              >
                {formatTimeAgo(crew.activeSessionLastPingAt)}
              </span>
            </span>,
          ],
        };
      });
  }, [crewManagement]);

  // Mini table: Latest registrations
  const latestRegistrationsRows = useMemo(() => {
    if (!registrations) return [];

    return registrations.slice(0, 5).map((reg) => {
      const statusPill = (
        <span
          className={`inline-block rounded-[999px] border px-2 py-0.5 text-caption ${
            reg.status === "APPROVED"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : reg.status === "REJECTED"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : reg.status === "NEEDS_INFO"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          }`}
        >
          {reg.status.replace("_", " ")}
        </span>
      );

      return {
        id: reg.id,
        cells: [
          <span key="name" className="font-medium text-white">
            {reg.proposed_name}
          </span>,
          reg.corridors?.name || "Unknown",
          statusPill,
          <span
            key="time"
            title={new Date(reg.updated_at || reg.created_at).toLocaleString()}
          >
            {formatTimeAgo(reg.updated_at || reg.created_at)}
          </span>,
        ],
      };
    });
  }, [registrations]);

  // Mini table: Role mismatches
  const roleMismatchRows = useMemo(() => {
    if (!users) return [];

    return users
      .filter((user) => user.roleMismatch)
      .slice(0, 5)
      .map((user) => {
        const issueType = !user.authRole ? "No auth claim" : "Misaligned";

        return {
          id: user.id,
          cells: [
            <span key="user" className="font-medium text-white">
              {user.handle || user.email || formatShortId(user.id)}
            </span>,
            <span key="issue" className="text-amber-200">
              {issueType}
            </span>,
            user.lastSignInAt ? (
              <span
                key="time"
                title={new Date(user.lastSignInAt).toLocaleString()}
              >
                {formatTimeAgo(user.lastSignInAt)}
              </span>
            ) : (
              "Never"
            ),
          ],
        };
      });
  }, [users]);

  // Determine alert card severities
  const registrationsSeverity =
    (overview?.pendingRegistrations || 0) > 5
      ? "warning"
      : (overview?.pendingRegistrations || 0) > 0
        ? "info"
        : "ok";

  const crewSeverity =
    (overview?.crewWithoutAssignment || 0) > 3 ? "warning" : "info";

  const sessionsSeverity =
    (overview?.staleLiveSessions || 0) > 0 ? "warning" : "ok";

  const rolesSeverity =
    (overview?.roleMismatches || 0) > 3
      ? "warning"
      : (overview?.roleMismatches || 0) > 0
        ? "info"
        : "ok";

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6">
        <div className="text-tag text-[var(--color-accent)]">
          Admin operations
        </div>
        <h1 className="mt-1 text-h2 text-white">Control room</h1>
        <p className="mt-2 max-w-3xl text-body text-[var(--color-text-secondary)]">
          Monitor system health, triage work queue, and drill into issues with
          one click.
        </p>
      </div>

      {/* Show full skeleton on initial load */}
      {isLoadingOverview && !overview ? (
        <div className="space-y-6">
          {/* Alert cards skeleton */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-[24px] bg-[rgba(23,23,31,0.94)]"
              />
            ))}
          </div>
          {/* Work queue + activity skeleton */}
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="h-64 animate-pulse rounded-[28px] bg-[rgba(23,23,31,0.94)]" />
            <div className="h-64 animate-pulse rounded-[28px] bg-[rgba(23,23,31,0.94)]" />
          </div>
          {/* Mini tables skeleton */}
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="h-80 animate-pulse rounded-[28px] bg-[rgba(23,23,31,0.94)]" />
            <div className="h-80 animate-pulse rounded-[28px] bg-[rgba(23,23,31,0.94)]" />
          </div>
        </div>
      ) : (
        <>
          {/* Alert cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AlertCard
              label="Pending registrations"
              value={overview?.pendingRegistrations ?? 0}
              helper={`${overview?.needsInfoRegistrations ?? 0} waiting for more info`}
              icon={<ClipboardList className="h-5 w-5" />}
              severity={registrationsSeverity}
              to="/admin/registrations"
            />
            <AlertCard
              label="Crew without assignment"
              value={overview?.crewWithoutAssignment ?? 0}
              helper={`${overview?.totalCrew ?? 0} crew accounts total`}
              icon={<UserCog className="h-5 w-5" />}
              severity={crewSeverity}
              to="/admin/crew"
            />
            <AlertCard
              label="Active live sessions"
              value={overview?.activeLiveSessions ?? 0}
              helper={`${overview?.staleLiveSessions ?? 0} sessions may be stale`}
              icon={<RadioTower className="h-5 w-5" />}
              severity={sessionsSeverity}
              to="/admin/live"
            />
            <AlertCard
              label="Role mismatches"
              value={overview?.roleMismatches ?? 0}
              helper={`${overview?.totalUsers ?? 0} total accounts in scope`}
              icon={<ShieldAlert className="h-5 w-5" />}
              severity={rolesSeverity}
              to="/admin/users"
            />
          </div>

          {/* Work queue + Recent activity */}
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <WorkQueuePanel items={workQueue} />
            <RecentActivityFeed items={recentActivity} />
          </div>

          {/* Mini tables */}
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <MiniTable
              title="Live sessions now"
              columns={["Nganya", "Route", "Last ping"]}
              rows={liveSessionsRows}
              emptyMessage="No live sessions right now"
              actionLabel="View all"
              actionTo="/admin/live"
            />
            <MiniTable
              title="Latest registrations"
              columns={["Name", "Route", "Status", "Updated"]}
              rows={latestRegistrationsRows}
              emptyMessage="No recent registrations"
              actionLabel="Review queue"
              actionTo="/admin/registrations"
            />
          </div>

          {roleMismatchRows.length > 0 && (
            <div className="mt-6">
              <MiniTable
                title="Role mismatches"
                columns={["User", "Issue", "Last sign-in"]}
                rows={roleMismatchRows}
                emptyMessage="Role hygiene ✅"
                actionLabel="Fix roles"
                actionTo="/admin/users"
              />
            </div>
          )}

          {/* Quick actions with badges */}
          <section className="mt-6 rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
            <h2 className="text-h3 text-white">Quick actions</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Link
                to="/admin/registrations"
                className="block rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 no-underline transition-all hover:border-[var(--glass-border-hover)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    Review registrations
                  </div>
                  {(overview?.pendingRegistrations || 0) > 0 && (
                    <span className="rounded-[999px] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-caption text-[var(--color-accent)]">
                      {overview?.pendingRegistrations}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                  Approve requests, request changes, and map approved nganyas
                  automatically.
                </div>
              </Link>

              <Link
                to="/admin/crew"
                className="block rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 no-underline transition-all hover:border-[var(--glass-border-hover)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    Manage crew
                  </div>
                  {(overview?.crewWithoutAssignment || 0) > 0 && (
                    <span className="rounded-[999px] border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-caption text-amber-200">
                      {overview?.crewWithoutAssignment} unassigned
                    </span>
                  )}
                </div>
                <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                  See assignment state, pending requests, and active live
                  sessions in one place.
                </div>
              </Link>

              <Link
                to="/admin/users"
                className="block rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 no-underline transition-all hover:border-[var(--glass-border-hover)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    Manage users
                  </div>
                  {(overview?.roleMismatches || 0) > 0 && (
                    <span className="rounded-[999px] border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-caption text-amber-200">
                      {overview?.roleMismatches} mismatched
                    </span>
                  )}
                </div>
                <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                  Fix role mismatches, promote crew, and audit profile/auth
                  consistency.
                </div>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
