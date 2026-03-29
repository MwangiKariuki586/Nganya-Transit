import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { AdminStatusBadge } from "@/modules/admin/components/AdminStatusBadge";
import { useAdminStore } from "@/stores/useAdminStore";
import type { AppRole } from "@/shared/types/rbac";
import { LoadingButton } from "@/components/ui/loading";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatTimeAgo, formatShortId } from "@/lib/admin-utils";
import { Link } from "@tanstack/react-router";

interface UserDetailDrawerProps {
  userId: string;
  onClose: () => void;
}

const roleOptions: AppRole[] = ["fan", "crew", "admin"];

function formatRoleLabel(role: AppRole | null) {
  return role ? role.toUpperCase() : "NONE";
}

export function UserDetailDrawer({ userId, onClose }: UserDetailDrawerProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "overview" | "roles" | "crew" | "audit"
  >("overview");
  const [isFixing, setIsFixing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [signoutReason, setSignoutReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [selectedFixRole, setSelectedFixRole] = useState<AppRole | null>(null);

  const userDetail = useAdminStore((state) => state.userDetail);
  const isLoading = useAdminStore((state) => state.isLoadingUserDetail);
  const fetchUserDetail = useAdminStore((state) => state.fetchUserDetail);
  const fixRoleMismatch = useAdminStore((state) => state.fixRoleMismatch);
  const forceUserSignout = useAdminStore((state) => state.forceUserSignout);
  const suspendUser = useAdminStore((state) => state.suspendUser);
  const deleteUser = useAdminStore((state) => state.deleteUser);

  useEffect(() => {
    void fetchUserDetail(userId);
  }, [userId, fetchUserDetail]);

  const handleFixMismatch = async () => {
    if (!selectedFixRole) return;

    setIsFixing(true);
    try {
      const result = await fixRoleMismatch(userId, selectedFixRole);
      addToast("Role sources aligned successfully.", "success");
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning) => addToast(warning, "info"));
      }
      void fetchUserDetail(userId);
    } catch (error: any) {
      addToast(error?.message || "Failed to fix mismatch.", "error");
    } finally {
      setIsFixing(false);
      setSelectedFixRole(null);
    }
  };

  const handleForceSignout = async () => {
    setIsSigningOut(true);
    try {
      await forceUserSignout(userId, signoutReason || undefined);
      addToast("User signed out successfully.", "success");
      setShowSignoutConfirm(false);
      setSignoutReason("");
    } catch (error: any) {
      addToast(error?.message || "Failed to sign out user.", "error");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason || suspendReason.trim().length < 10) {
      addToast("Suspension reason must be at least 10 characters.", "error");
      return;
    }

    setIsSuspending(true);
    try {
      await suspendUser(userId, suspendReason);
      addToast("User suspended successfully.", "success");
      setShowSuspendConfirm(false);
      setSuspendReason("");
      onClose();
    } catch (error: any) {
      addToast(error?.message || "Failed to suspend user.", "error");
    } finally {
      setIsSuspending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason || deleteReason.trim().length < 20) {
      addToast("Deletion reason must be at least 20 characters.", "error");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUser(userId, deleteReason);
      addToast("User deleted successfully.", "success");
      setShowDeleteConfirm(false);
      setDeleteReason("");
      onClose();
    } catch (error: any) {
      addToast(error?.message || "Failed to delete user.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-[var(--glass-border)] bg-[rgba(23,23,31,0.98)] shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--glass-border)] bg-[rgba(23,23,31,0.98)] p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-h4 text-white">User details</h3>
              {!isLoading && userDetail && (
                <p className="mt-1 text-body-sm text-[var(--color-text-secondary)]">
                  {userDetail.fullName || userDetail.handle || "Unnamed user"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--glass-border-hover)] hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2">
            {(["overview", "roles", "crew", "audit"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-[14px] px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-[20px] bg-[rgba(10,10,15,0.55)]"
                />
              ))}
            </div>
          ) : !userDetail ? (
            <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-8 text-center text-[var(--color-text-secondary)]">
              Failed to load user details.
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-5">
                    <div className="text-caption text-[var(--color-text-tertiary)]">
                      Account information
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          Email:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">
                            {userDetail.email || "No email"}
                          </span>
                          {userDetail.email && (
                            <CopyButton text={userDetail.email} />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          Handle:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">
                            {userDetail.handle || "—"}
                          </span>
                          {userDetail.handle && (
                            <CopyButton text={userDetail.handle} />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          Full name:
                        </span>
                        <span className="text-white">
                          {userDetail.fullName || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          User ID:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white">
                            {formatShortId(userDetail.id)}
                          </span>
                          <CopyButton text={userDetail.id} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-5">
                    <div className="text-caption text-[var(--color-text-tertiary)]">
                      Activity
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          Created:
                        </span>
                        <span
                          className="text-white"
                          title={
                            userDetail.createdAt
                              ? new Date(userDetail.createdAt).toLocaleString()
                              : undefined
                          }
                        >
                          {formatTimeAgo(userDetail.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          Last sign-in:
                        </span>
                        <span
                          className="text-white"
                          title={
                            userDetail.lastSignInAt
                              ? new Date(
                                  userDetail.lastSignInAt,
                                ).toLocaleString()
                              : undefined
                          }
                        >
                          {formatTimeAgo(userDetail.lastSignInAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Roles Tab */}
              {activeTab === "roles" && (
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-caption text-[var(--color-text-tertiary)]">
                        Role health
                      </div>
                      <AdminStatusBadge
                        tone={userDetail.roleMismatch ? "amber" : "green"}
                      >
                        {userDetail.roleMismatch ? "Misaligned" : "Aligned"}
                      </AdminStatusBadge>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          Profile role:
                        </span>
                        <span className="font-semibold text-white">
                          {formatRoleLabel(userDetail.profileRole)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          UserRoles table:
                        </span>
                        <span className="font-semibold text-white">
                          {formatRoleLabel(userDetail.userRole)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">
                          Auth claim:
                        </span>
                        <span className="font-semibold text-white">
                          {formatRoleLabel(userDetail.authRole)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {userDetail.roleMismatch && (
                    <div className="rounded-[20px] border border-amber-500/30 bg-amber-500/10 p-5">
                      <div className="text-caption font-semibold text-amber-200">
                        ⚠️ Fix role mismatch
                      </div>
                      <p className="mt-2 text-sm text-amber-200/80">
                        Align all role sources to a single target role. This
                        will update Profile, UserRoles, and Auth metadata.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {roleOptions.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setSelectedFixRole(role)}
                            className={`rounded-[14px] border px-4 py-2 text-sm font-semibold transition-all ${
                              selectedFixRole === role
                                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-500/50"
                            }`}
                          >
                            {role.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      {selectedFixRole && (
                        <div className="mt-4">
                          <LoadingButton
                            variant="primary"
                            size="md"
                            isLoading={isFixing}
                            loadingLabel="Fixing..."
                            onClick={handleFixMismatch}
                            className="w-full"
                          >
                            Align to {selectedFixRole.toUpperCase()}
                          </LoadingButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Crew Tab */}
              {activeTab === "crew" && (
                <div className="space-y-4">
                  {userDetail.profileRole === "crew" ? (
                    <>
                      <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-5">
                        <div className="text-caption text-[var(--color-text-tertiary)]">
                          Crew assignment
                        </div>
                        {userDetail.crewAssignment ? (
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[var(--color-text-secondary)]">
                                Nganya:
                              </span>
                              <span className="text-white">
                                {userDetail.crewAssignment.nganyaName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--color-text-secondary)]">
                                Corridor:
                              </span>
                              <span className="text-white">
                                {userDetail.crewAssignment.corridorName}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                            No nganya assigned
                          </p>
                        )}
                      </div>
                      <Link
                        to="/admin/crew"
                        search={{ userId: userDetail.id }}
                        className="block rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      >
                        View in Crew Operations →
                      </Link>
                    </>
                  ) : (
                    <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
                      User is not crew
                    </div>
                  )}
                </div>
              )}

              {/* Audit Tab */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  {userDetail.auditLogs && userDetail.auditLogs.length > 0 ? (
                    userDetail.auditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {log.actionType.replace(/_/g, " ")}
                            </div>
                            <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                              by {log.actorEmail}
                            </div>
                          </div>
                          <div className="text-caption text-[var(--color-text-tertiary)]">
                            {formatTimeAgo(log.createdAt)}
                          </div>
                        </div>
                        {log.note && (
                          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                            {log.note}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
                      No audit logs found
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone */}
              <details className="mt-6 rounded-[20px] border border-red-500/30 bg-red-500/5">
                <summary className="cursor-pointer p-5 text-sm font-semibold text-red-400">
                  Danger zone
                </summary>
                <div className="space-y-3 border-t border-red-500/30 p-5">
                  {/* Force Sign-out */}
                  {!showSignoutConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowSignoutConfirm(true)}
                      className="w-full rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/20"
                    >
                      Force sign-out
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-[14px] border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-sm text-red-400">
                        This will revoke all active sessions for this user.
                      </p>
                      <input
                        type="text"
                        value={signoutReason}
                        onChange={(e) => setSignoutReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-white placeholder:text-red-400/50 focus:border-red-500/50 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <LoadingButton
                          variant="primary"
                          size="sm"
                          isLoading={isSigningOut}
                          loadingLabel="Signing out..."
                          onClick={handleForceSignout}
                          className="flex-1 bg-red-500 hover:bg-red-600"
                        >
                          Confirm sign-out
                        </LoadingButton>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSignoutConfirm(false);
                            setSignoutReason("");
                          }}
                          className="flex-1 rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[var(--glass-border-hover)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Suspend User */}
                  {!showSuspendConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowSuspendConfirm(true)}
                      className="w-full rounded-[14px] border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-400 transition-all hover:border-orange-500/50 hover:bg-orange-500/20"
                    >
                      Suspend account
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-[14px] border border-orange-500/30 bg-orange-500/10 p-4">
                      <p className="text-sm text-orange-400">
                        This will ban the user indefinitely. They will not be
                        able to sign in.
                      </p>
                      <textarea
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="Suspension reason (required, min 10 characters)"
                        rows={3}
                        className="w-full rounded-[14px] border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-white placeholder:text-orange-400/50 focus:border-orange-500/50 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <LoadingButton
                          variant="primary"
                          size="sm"
                          isLoading={isSuspending}
                          loadingLabel="Suspending..."
                          onClick={handleSuspend}
                          className="flex-1 bg-orange-500 hover:bg-orange-600"
                        >
                          Confirm suspend
                        </LoadingButton>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSuspendConfirm(false);
                            setSuspendReason("");
                          }}
                          className="flex-1 rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[var(--glass-border-hover)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete User */}
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full rounded-[14px] border border-red-600/50 bg-red-600/20 px-4 py-3 text-sm font-semibold text-red-300 transition-all hover:border-red-600/70 hover:bg-red-600/30"
                    >
                      Delete user permanently
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-[14px] border border-red-600/50 bg-red-600/20 p-4">
                      <p className="text-sm font-semibold text-red-300">
                        ⚠️ PERMANENT DELETION
                      </p>
                      <p className="text-sm text-red-300/80">
                        This action CANNOT be undone. All user data will be
                        permanently deleted.
                      </p>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Deletion reason (required, min 20 characters)"
                        rows={3}
                        className="w-full rounded-[14px] border border-red-600/50 bg-red-600/20 px-4 py-2 text-sm text-white placeholder:text-red-300/50 focus:border-red-600/70 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <LoadingButton
                          variant="primary"
                          size="sm"
                          isLoading={isDeleting}
                          loadingLabel="Deleting..."
                          onClick={handleDelete}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          Confirm deletion
                        </LoadingButton>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteReason("");
                          }}
                          className="flex-1 rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[var(--glass-border-hover)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
