import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { AdminStatusBadge } from '@/modules/admin/components/AdminStatusBadge'
import { adminDashboardService } from '@/modules/admin/services/admin-dashboard-service'
import type { AdminUserRecord } from '@/shared/types/admin-dashboard'
import type { AppRole } from '@/shared/types/rbac'

const roleFilters: Array<AppRole | 'all'> = ['all', 'fan', 'crew', 'admin']
const roleOptions: AppRole[] = ['fan', 'crew', 'admin']

function formatRoleLabel(role: AppRole | null) {
  return role ? role.toUpperCase() : 'NONE'
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString()
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMutatingUserId, setIsMutatingUserId] = useState<string | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextUsers = await adminDashboardService.listUsers()
      setUsers(nextUsers)
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load users.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.profileRole === roleFilter
      const haystack = [
        user.email,
        user.handle,
        user.fullName,
        user.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesRole && (!needle || haystack.includes(needle))
    })
  }, [roleFilter, search, users])

  const handleRoleUpdate = async (userId: string, role: AppRole) => {
    setIsMutatingUserId(userId)
    setError(null)

    try {
      await adminDashboardService.updateUserRole(userId, role)
      await loadUsers()
    } catch (mutationError: any) {
      setError(mutationError?.message || 'Failed to update user role.')
    } finally {
      setIsMutatingUserId(null)
    }
  }

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Admin users</div>
          <h1 className="mt-1 text-h2 text-white">Users and roles</h1>
          <p className="mt-2 max-w-3xl text-body text-[var(--color-text-secondary)]">
            Search accounts, audit role consistency, and update access without touching the database manually.
          </p>
        </div>
        <div className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          Results <span className="ml-1 font-semibold text-white">{filteredUsers.length}</span>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-[20px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

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
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                    : 'border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]'
                }`}
              >
                {filter === 'all' ? 'All roles' : filter.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-caption text-[var(--color-text-tertiary)]">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role sources</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Last sign-in</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-sm text-[var(--color-text-secondary)]">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-sm text-[var(--color-text-secondary)]">
                    No users match the current filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="rounded-[20px] bg-[rgba(10,10,15,0.55)] text-sm">
                    <td className="rounded-l-[20px] px-3 py-4 align-top">
                      <div className="font-semibold text-white">{user.fullName || user.handle || 'Unnamed user'}</div>
                      <div className="mt-1 text-[var(--color-text-secondary)]">{user.email || 'No email'}</div>
                      <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">{user.id}</div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <AdminStatusBadge tone="neutral">Profile {formatRoleLabel(user.profileRole)}</AdminStatusBadge>
                        <AdminStatusBadge tone="neutral">UserRoles {formatRoleLabel(user.userRole)}</AdminStatusBadge>
                        <AdminStatusBadge tone="neutral">Auth {formatRoleLabel(user.authRole)}</AdminStatusBadge>
                        {user.roleMismatch ? (
                          <AdminStatusBadge tone="red">Mismatch</AdminStatusBadge>
                        ) : (
                          <AdminStatusBadge tone="green">Aligned</AdminStatusBadge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top text-[var(--color-text-secondary)]">{formatDate(user.createdAt)}</td>
                    <td className="px-3 py-4 align-top text-[var(--color-text-secondary)]">{formatDate(user.lastSignInAt)}</td>
                    <td className="rounded-r-[20px] px-3 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        {roleOptions.map((role) => (
                          <Button
                            key={role}
                            variant={user.profileRole === role ? 'primary' : 'secondary'}
                            className="min-h-[36px] rounded-[14px] px-3 text-xs font-semibold"
                            isLoading={isMutatingUserId === user.id}
                            disabled={isMutatingUserId === user.id && user.profileRole !== role}
                            onClick={() => { void handleRoleUpdate(user.id, role) }}
                          >
                            {role.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
