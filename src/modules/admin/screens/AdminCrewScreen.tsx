import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastContainer";
import { InlineErrorState } from "@/components/error/InlineErrorState";
import { AdminStatusBadge } from "@/modules/admin/components/AdminStatusBadge";
import { useAdminStore } from "@/stores/useAdminStore";
import {
  TableSkeleton,
  LoadingButton,
  InlineTableLoader,
  RowPendingOverlay,
} from "@/components/ui/loading";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  formatTimeAgo,
  formatShortId,
  getLiveHealthTone,
} from "@/lib/admin-utils";

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

export default function AdminCrewScreen() {
  const { addToast, showErrorToast } = useToast();
  const [search, setSearch] = useState("");
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, string>
  >({});
  const [dirtyCrewIds, setDirtyCrewIds] = useState<Set<string>>(new Set());
  const [isMutatingCrewId, setIsMutatingCrewId] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState<string | null>(
    null,
  );

  const crewManagement = useAdminStore((state) => state.crewManagement);
  const isLoading = useAdminStore((state) => state.isLoadingCrewManagement);
  const error = useAdminStore((state) => state.crewManagementError);
  const fetchCrewManagement = useAdminStore(
    (state) => state.fetchCrewManagement,
  );
  const assignCrewNganyaAction = useAdminStore(
    (state) => state.assignCrewNganya,
  );
  const unassignCrewNganyaAction = useAdminStore(
    (state) => state.unassignCrewNganya,
  );

  const crewRows = crewManagement?.crewRows ?? [];
  const nganyaOptions = crewManagement?.nganyaOptions ?? [];

  useEffect(() => {
    void fetchCrewManagement();
  }, [fetchCrewManagement]);

  // Show full skeleton on initial load (no data yet)
  if (isLoading && !crewManagement) {
    return (
      <div className="page-container py-8 md:py-10">
        <div className="mb-6">
          <div className="text-tag text-[var(--color-accent)]">Admin crew</div>
          <h1 className="mt-1 text-h2 text-white">Crew operations</h1>
        </div>
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <TableSkeleton rows={5} columns={5} />
        </section>
      </div>
    );
  }

  if (error && !crewManagement && !isLoading) {
    return (
      <div className="page-container py-8 md:py-10">
        <div className="mb-6">
          <div className="text-tag text-[var(--color-accent)]">Admin crew</div>
          <h1 className="mt-1 text-h2 text-white">Crew operations</h1>
        </div>
        <InlineErrorState
          title="Crew operations failed to load"
          message="Crew mapping and session data could not be loaded."
          onRetry={() => {
            void fetchCrewManagement();
          }}
        />
      </div>
    );
  }

  useEffect(() => {
    if (!crewRows.length) return;

    const initialDrafts = Object.fromEntries(
      crewRows.map((crew) => [crew.id, crew.assignedNganyaId || ""]),
    );
    setAssignmentDrafts(initialDrafts);
    setDirtyCrewIds(new Set());
  }, [crewRows]);

  const handleDraftChange = (crewId: string, nganyaId: string) => {
    setAssignmentDrafts((current) => ({
      ...current,
      [crewId]: nganyaId,
    }));

    // Mark as dirty if different from original
    const originalValue =
      crewRows.find((c) => c.id === crewId)?.assignedNganyaId || "";
    setDirtyCrewIds((current) => {
      const next = new Set(current);
      if (nganyaId !== originalValue) {
        next.add(crewId);
      } else {
        next.delete(crewId);
      }
      return next;
    });
  };

  const filteredCrew = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return crewRows.filter((crew) => {
      const haystack = [
        crew.fullName,
        crew.handle,
        crew.email,
        crew.assignedNganyaName,
        crew.assignedCorridorName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !needle || haystack.includes(needle);
    });
  }, [crewRows, search]);

  const handleAssign = async (crewUserId: string) => {
    const nganyaId = assignmentDrafts[crewUserId];
    if (!nganyaId) {
      addToast("Select a nganya before assigning.", "error");
      return;
    }

    setIsMutatingCrewId(crewUserId);

    try {
      await assignCrewNganyaAction(crewUserId, nganyaId);
      await fetchCrewManagement();
      addToast("Crew assignment saved.", "success");

      // Clear dirty state
      setDirtyCrewIds((current) => {
        const next = new Set(current);
        next.delete(crewUserId);
        return next;
      });
    } catch (mutationError: any) {
      showErrorToast(mutationError, "Failed to assign crew nganya.");
    } finally {
      setIsMutatingCrewId(null);
    }
  };

  const handleUnassign = async (crewUserId: string) => {
    setIsMutatingCrewId(crewUserId);

    try {
      await unassignCrewNganyaAction(crewUserId);
      await fetchCrewManagement();
      addToast("Crew assignment removed.", "success");
      setShowUnassignConfirm(null);

      // Clear dirty state
      setDirtyCrewIds((current) => {
        const next = new Set(current);
        next.delete(crewUserId);
        return next;
      });
    } catch (mutationError: any) {
      showErrorToast(mutationError, "Failed to remove crew assignment.");
    } finally {
      setIsMutatingCrewId(null);
    }
  };

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Admin crew</div>
          <h1 className="mt-1 text-h2 text-white">Crew operations</h1>
          <p className="mt-2 max-w-3xl text-body text-[var(--color-text-secondary)]">
            Map crew to nganyas, watch request status, and identify live or
            blocked accounts quickly.
          </p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search crew, assignment, or corridor"
          className="w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none md:max-w-sm"
        />
      </div>

      <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
        {isRefetching && (
          <div className="mb-4">
            <InlineTableLoader />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-caption text-[var(--color-text-tertiary)]">
                <th className="px-3 py-2">Crew</th>
                <th className="px-3 py-2">Assignment</th>
                <th className="px-3 py-2">Registration</th>
                <th className="px-3 py-2">Live status</th>
                <th className="px-3 py-2">Manage</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4">
                    <TableSkeleton rows={5} columns={5} />
                  </td>
                </tr>
              ) : filteredCrew.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-[var(--color-text-secondary)]"
                  >
                    No crew accounts match the current search.
                  </td>
                </tr>
              ) : (
                filteredCrew.map((crew) => {
                  const isDirty = dirtyCrewIds.has(crew.id);
                  const isPending = isMutatingCrewId === crew.id;
                  const liveHealthTone = crew.activeSessionLastPingAt
                    ? getLiveHealthTone(crew.activeSessionLastPingAt)
                    : "red";

                  return (
                    <tr
                      key={crew.id}
                      className="relative bg-[rgba(10,10,15,0.55)] text-sm"
                    >
                      <td className="rounded-l-[20px] px-3 py-4 align-top">
                        <div className="font-semibold text-white">
                          {crew.fullName || crew.handle || "Unnamed crew"}
                        </div>
                        <div className="mt-1 text-[var(--color-text-secondary)]">
                          {crew.email || "No email"}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-caption text-[var(--color-text-tertiary)]">
                            {formatShortId(crew.id)}
                          </span>
                          <CopyButton text={crew.id} />
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="space-y-2">
                          <div className="font-medium text-white">
                            {crew.assignedNganyaName || "No nganya assigned"}
                          </div>
                          {crew.assignedCorridorName && (
                            <div className="inline-flex rounded-[12px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-2 py-1 text-caption text-[var(--color-text-secondary)]">
                              {crew.assignedCorridorName}
                            </div>
                          )}
                          {crew.assignedNganyaId && (
                            <AdminStatusBadge
                              tone={crew.assignmentVerified ? "green" : "amber"}
                            >
                              {crew.assignmentVerified
                                ? "✓ Verified"
                                : "Pending verification"}
                            </AdminStatusBadge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        {crew.latestRequestStatus ? (
                          <div className="space-y-1.5">
                            <AdminStatusBadge
                              tone={
                                crew.latestRequestStatus === "APPROVED"
                                  ? "green"
                                  : crew.latestRequestStatus === "PENDING"
                                    ? "accent"
                                    : crew.latestRequestStatus === "NEEDS_INFO"
                                      ? "amber"
                                      : "red"
                              }
                            >
                              {crew.latestRequestStatus.replace("_", " ")}
                            </AdminStatusBadge>
                            <div className="text-caption text-[var(--color-text-tertiary)]">
                              {formatTimeAgo(crew.latestRequestUpdatedAt)}
                            </div>
                          </div>
                        ) : (
                          <AdminStatusBadge tone="neutral">
                            No registration
                          </AdminStatusBadge>
                        )}
                      </td>
                      <td className="px-3 py-4 align-top">
                        {crew.activeSessionId ? (
                          <div className="space-y-1.5">
                            <AdminStatusBadge tone={liveHealthTone}>
                              LIVE
                            </AdminStatusBadge>
                            <div className="text-caption text-[var(--color-text-tertiary)]">
                              Last ping{" "}
                              {formatTimeAgo(crew.activeSessionLastPingAt)}
                            </div>
                            <div className="text-caption text-[var(--color-text-tertiary)]">
                              Started{" "}
                              {formatTimeAgo(crew.activeSessionStartedAt)}
                            </div>
                          </div>
                        ) : (
                          <AdminStatusBadge tone="neutral">
                            Offline
                          </AdminStatusBadge>
                        )}
                      </td>
                      <td className="rounded-r-[20px] px-3 py-4 align-top">
                        <div className="space-y-3">
                          {/* Show dropdown only if unassigned or editing */}
                          {(!crew.assignedNganyaId || isDirty) && (
                            <select
                              value={assignmentDrafts[crew.id] || ""}
                              onChange={(event) =>
                                handleDraftChange(crew.id, event.target.value)
                              }
                              disabled={isPending}
                              className="w-full rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
                            >
                              <option value="">
                                {crew.assignedNganyaId
                                  ? "Change nganya..."
                                  : "Select nganya"}
                              </option>
                              {nganyaOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name} · {option.corridorName}
                                </option>
                              ))}
                            </select>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {/* Save button when changes made */}
                            {isDirty && (
                              <>
                                <LoadingButton
                                  variant="primary"
                                  size="sm"
                                  className="rounded-[14px] px-3 text-xs font-semibold"
                                  isLoading={isPending}
                                  loadingLabel="Saving..."
                                  onClick={() => {
                                    void handleAssign(crew.id);
                                  }}
                                >
                                  {crew.assignedNganyaId ? "Update" : "Assign"}
                                </LoadingButton>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Reset to original value
                                    setAssignmentDrafts((current) => ({
                                      ...current,
                                      [crew.id]: crew.assignedNganyaId || "",
                                    }));
                                    setDirtyCrewIds((current) => {
                                      const next = new Set(current);
                                      next.delete(crew.id);
                                      return next;
                                    });
                                  }}
                                  disabled={isPending}
                                  className="rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:border-[var(--glass-border-hover)] hover:text-white disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {/* Action buttons when assigned and not editing */}
                            {crew.assignedNganyaId && !isDirty && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Trigger edit mode by clearing draft
                                    setAssignmentDrafts((current) => ({
                                      ...current,
                                      [crew.id]: "",
                                    }));
                                    setDirtyCrewIds((current) => {
                                      const next = new Set(current);
                                      next.add(crew.id);
                                      return next;
                                    });
                                  }}
                                  disabled={isPending}
                                  className="rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
                                >
                                  Change
                                </button>
                                <LoadingButton
                                  variant="secondary"
                                  size="sm"
                                  className="rounded-[14px] px-3 text-xs font-semibold"
                                  isLoading={isPending}
                                  loadingLabel="Removing..."
                                  onClick={() =>
                                    setShowUnassignConfirm(crew.id)
                                  }
                                >
                                  Remove
                                </LoadingButton>
                              </>
                            )}

                            {/* Assign button when unassigned and not editing */}
                            {!crew.assignedNganyaId && !isDirty && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Trigger edit mode
                                  setDirtyCrewIds((current) => {
                                    const next = new Set(current);
                                    next.add(crew.id);
                                    return next;
                                  });
                                }}
                                disabled={isPending}
                                className="rounded-[14px] border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition-all hover:bg-[var(--color-accent)]/20 disabled:opacity-50"
                              >
                                Assign nganya
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      {isPending && (
                        <td className="absolute inset-0">
                          <RowPendingOverlay label="Updating..." />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Unassign confirmation modal */}
      {showUnassignConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => !isMutatingCrewId && setShowUnassignConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.98)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-h4 text-white">Remove assignment</h3>
            <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
              This will unassign the nganya from this crew member. They will
              need to be reassigned before going live.
            </p>
            <div className="mt-5 flex gap-3">
              <LoadingButton
                variant="danger"
                isLoading={isMutatingCrewId === showUnassignConfirm}
                loadingLabel="Removing..."
                onClick={() => {
                  void handleUnassign(showUnassignConfirm);
                }}
                className="flex-1"
              >
                Confirm remove
              </LoadingButton>
              <LoadingButton
                variant="secondary"
                onClick={() => setShowUnassignConfirm(null)}
                disabled={isMutatingCrewId === showUnassignConfirm}
                className="flex-1"
              >
                Cancel
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
