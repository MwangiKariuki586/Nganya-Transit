import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { InlineErrorState } from "@/components/error/InlineErrorState";
import { AdminStatusBadge } from "@/modules/admin/components/AdminStatusBadge";
import { UserDetailDrawer } from "@/modules/admin/components/UserDetailDrawer";
import { useAdminStore } from "@/stores/useAdminStore";
import type { AppRole } from "@/shared/types/rbac";
import {
  TableSkeleton,
  LoadingButton,
  InlineTableLoader,
  RowPendingOverlay,
} from "@/components/ui/loading";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatTimeAgo, formatShortId } from "@/lib/admin-utils";

const roleFilters: Array<AppRole | "all" | "misaligned"> = [
  "all",
  "fan",
  "crew",
  "admin",
  "misaligned",
];
const roleOptions: AppRole[] = ["fan", "crew", "admin"];

function formatRoleLabel(role: AppRole | null) {
  return role ? role.toUpperCase() : "NONE";
}

export default function AdminUsersScreen() {
  const { addToast, showErrorToast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all" | "misaligned">(
    "all",
  );
  const [isMutatingUserId, setIsMutatingUserId] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);

  const users = useAdminStore((state) => state.users);
  const isLoading = useAdminStore((state) => state.isLoadingUsers);
  const error = useAdminStore((state) => state.usersError);
  const fetchUsers = useAdminStore((state) => state.fetchUsers);
  const updateUserRole = useAdminStore((state) => state.updateUserRole);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Show full skeleton on initial load (no data yet)
  if (isLoading && !users.length) {
    return (
      <div className="page-container py-8 md:py-10">
        <div className="mb-6">
          <div className="text-tag text-[var(--color-accent)]">Admin users</div>
          <h1 className="mt-1 text-h2 text-white">Users and roles</h1>
        </div>
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <TableSkeleton rows={5} columns={6} />
        </section>
      </div>
    );
  }

  useEffect(() => {
    if (roleFilter !== "all" && users.length > 0) {
      setIsRefetching(true);
      fetchUsers().finally(() => setIsRefetching(false));
    }
  }, [roleFilter]);

  if (error && !users.length && !isLoading) {
    return (
      <div className="page-container py-8 md:py-10">
        <div className="mb-6">
          <div className="text-tag text-[var(--color-accent)]">Admin users</div>
          <h1 className="mt-1 text-h2 text-white">Users and roles</h1>
        </div>
        <InlineErrorState
          title="Users failed to load"
          message="The admin user directory is temporarily unavailable."
          onRetry={() => {
            void fetchUsers();
          }}
        />
      </div>
    );
  }

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return (users || []).filter((user) => {
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "misaligned" && user.roleMismatch) ||
        user.profileRole === roleFilter;
      const haystack = [user.email, user.handle, user.fullName, user.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesRole && (!needle || haystack.includes(needle));
    });
  }, [roleFilter, search, users]);

  const handleRoleUpdate = async (userId: string, role: AppRole) => {
    setIsMutatingUserId(userId);

    try {
      await updateUserRole(userId, role);
      await fetchUsers();
      addToast(`Role updated to ${role.toUpperCase()}.`, "success");
    } catch (mutationError: any) {
      showErrorToast(mutationError, "Failed to update user role.");
    } finally {
      setIsMutatingUserId(null);
    }
  };

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Admin users</div>
          <h1 className="mt-1 text-h2 text-white">Users and roles</h1>
          <p className="mt-2 max-w-3xl text-body text-[var(--color-text-secondary)]">
            Search accounts, audit role consistency, and update access without
            touching the database manually.
          </p>
        </div>
        <div className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          Results{" "}
          <span className="ml-1 font-semibold text-white">
            {filteredUsers.length}
          </span>
        </div>
      </div>

      <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by email, handle, name, or user id"
            className="w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none lg:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {roleFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRoleFilter(filter)}
                className={`rounded-[16px] border px-3 py-2 text-sm font-semibold transition-all ${
                  roleFilter === filter
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]"
                }`}
              >
                {filter === "all"
                  ? "All"
                  : filter === "misaligned"
                    ? "Misaligned"
                    : filter.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {isRefetching && (
          <div className="mb-4">
            <InlineTableLoader />
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-caption text-[var(--color-text-tertiary)]">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role health</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Last sign-in</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4">
                    <TableSkeleton rows={5} columns={6} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-[var(--color-text-secondary)]"
                  >
                    No users match the current filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="relative cursor-pointer rounded-[20px] bg-[rgba(10,10,15,0.55)] text-sm transition-all hover:bg-[rgba(10,10,15,0.75)]"
                    onClick={() => setDrawerUserId(user.id)}
                  >
                    <td className="rounded-l-[20px] px-3 py-4 align-top">
                      <div className="font-semibold text-white">
                        {user.fullName || user.handle || "Unnamed user"}
                      </div>
                      <div className="mt-1 text-[var(--color-text-secondary)]">
                        {user.email || "No email"}
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-caption text-[var(--color-text-tertiary)]">
                          {formatShortId(user.id)}
                        </span>
                        <CopyButton text={user.id} />
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="space-y-2">
                        <AdminStatusBadge
                          tone={user.roleMismatch ? "amber" : "green"}
                        >
                          {user.roleMismatch ? "Misaligned" : "Aligned"}
                        </AdminStatusBadge>
                        {expandedUserId === user.id && (
                          <div className="mt-2 space-y-1 text-caption text-[var(--color-text-tertiary)]">
                            <div>
                              Profile: {formatRoleLabel(user.profileRole)}
                            </div>
                            <div>
                              UserRoles: {formatRoleLabel(user.userRole)}
                            </div>
                            <div>Auth: {formatRoleLabel(user.authRole)}</div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedUserId(
                              expandedUserId === user.id ? null : user.id,
                            );
                          }}
                          className="text-caption text-[var(--color-accent)] hover:underline"
                        >
                          {expandedUserId === user.id ? "Hide" : "Show"} sources
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top text-[var(--color-text-secondary)]">
                      <span
                        title={
                          user.createdAt
                            ? new Date(user.createdAt).toLocaleString()
                            : undefined
                        }
                      >
                        {formatTimeAgo(user.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-4 align-top text-[var(--color-text-secondary)]">
                      <span
                        title={
                          user.lastSignInAt
                            ? new Date(user.lastSignInAt).toLocaleString()
                            : undefined
                        }
                      >
                        {formatTimeAgo(user.lastSignInAt)}
                      </span>
                    </td>
                    <td
                      className="px-3 py-4 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-2">
                        {roleOptions.map((role) => (
                          <LoadingButton
                            key={role}
                            variant={
                              user.profileRole === role
                                ? "primary"
                                : "secondary"
                            }
                            size="sm"
                            className="min-h-[36px] rounded-[14px] px-3 text-xs font-semibold"
                            isLoading={isMutatingUserId === user.id}
                            loadingLabel="Saving..."
                            disabled={
                              isMutatingUserId !== null &&
                              isMutatingUserId !== user.id
                            }
                            onClick={() => {
                              if (user.profileRole !== role) {
                                void handleRoleUpdate(user.id, role);
                              }
                            }}
                          >
                            {role.toUpperCase()}
                          </LoadingButton>
                        ))}
                      </div>
                    </td>
                    <td
                      className="rounded-r-[20px] px-3 py-4 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {user.roleMismatch ? (
                        <button
                          type="button"
                          onClick={() => setDrawerUserId(user.id)}
                          className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-all hover:border-amber-500/50 hover:bg-amber-500/20"
                        >
                          Fix mismatch
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDrawerUserId(user.id)}
                          className="rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        >
                          Manage
                        </button>
                      )}
                    </td>
                    {isMutatingUserId === user.id && (
                      <td className="absolute inset-0">
                        <RowPendingOverlay label="Updating role..." />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* User detail drawer */}
      {drawerUserId && (
        <UserDetailDrawer
          userId={drawerUserId}
          onClose={() => setDrawerUserId(null)}
        />
      )}
    </div>
  );
}
