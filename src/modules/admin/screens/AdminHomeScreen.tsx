import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardList, RadioTower, ShieldAlert, Users, UserCog } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { AdminStatCard } from '@/modules/admin/components/AdminStatCard'
import { useAdminOverviewQuery } from '@/modules/admin/hooks/useAdminQueries'

const quickActions = [
  {
    to: '/admin/registrations',
    title: 'Review registrations',
    copy: 'Approve requests, request changes, and map approved nganyas automatically.',
  },
  {
    to: '/admin/users',
    title: 'Manage users',
    copy: 'Fix role mismatches, promote crew, and audit profile/auth consistency.',
  },
  {
    to: '/admin/crew',
    title: 'Manage crew',
    copy: 'See assignment state, pending requests, and active live sessions in one place.',
  },
] as const

export default function AdminHomeScreen() {
  const { addToast } = useToast()
  const { data: stats, isLoading, error } = useAdminOverviewQuery()

  useEffect(() => {
    if (!error) return
    addToast(error.message || 'Failed to load admin overview.', 'error')
  }, [addToast, error])

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Admin operations</div>
          <h1 className="mt-1 text-h2 text-white">Control room</h1>
          <p className="mt-2 max-w-3xl text-body text-[var(--color-text-secondary)]">
            Run moderation, crew assignment, and role hygiene from one operational surface.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Pending registrations"
          value={isLoading ? '...' : stats?.pendingRegistrations ?? 0}
          helper={`${stats?.needsInfoRegistrations ?? 0} waiting for more info`}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="accent"
        />
        <AdminStatCard
          label="Crew without assignment"
          value={isLoading ? '...' : stats?.crewWithoutAssignment ?? 0}
          helper={`${stats?.totalCrew ?? 0} crew accounts total`}
          icon={<UserCog className="h-5 w-5" />}
          accent="amber"
        />
        <AdminStatCard
          label="Active live sessions"
          value={isLoading ? '...' : stats?.activeLiveSessions ?? 0}
          helper={`${stats?.staleLiveSessions ?? 0} sessions may be stale`}
          icon={<RadioTower className="h-5 w-5" />}
          accent="green"
        />
        <AdminStatCard
          label="Role mismatches"
          value={isLoading ? '...' : stats?.roleMismatches ?? 0}
          helper={`${stats?.totalUsers ?? 0} total accounts in scope`}
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="cyan"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-caption text-[var(--color-text-tertiary)]">User mix</div>
              <h2 className="mt-2 text-h3 text-white">Who is in the system</h2>
            </div>
            <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
              Total users <span className="ml-1 font-semibold text-white">{stats?.totalUsers ?? 0}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
              <div className="text-caption text-[var(--color-text-tertiary)]">Fans</div>
              <div className="mt-2 text-h3 text-white">{isLoading ? '...' : stats?.totalFans ?? 0}</div>
            </div>
            <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
              <div className="text-caption text-[var(--color-text-tertiary)]">Crew</div>
              <div className="mt-2 text-h3 text-white">{isLoading ? '...' : stats?.totalCrew ?? 0}</div>
            </div>
            <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
              <div className="text-caption text-[var(--color-text-tertiary)]">Admins</div>
              <div className="mt-2 text-h3 text-white">{isLoading ? '...' : stats?.totalAdmins ?? 0}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-[var(--color-accent)]" />
            <h2 className="text-h3">Quick actions</h2>
          </div>
          <div className="mt-5 space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="block rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 no-underline transition-all hover:border-[var(--glass-border-hover)]"
              >
                <div className="text-sm font-semibold text-white">{action.title}</div>
                <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">{action.copy}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
