import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { AdminStatusBadge } from '@/modules/admin/components/AdminStatusBadge'
import { adminQueryKeys, useAdminCrewManagementQuery } from '@/modules/admin/hooks/useAdminQueries'
import { adminDashboardService } from '@/modules/admin/services/admin-dashboard-service'

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString()
}

export default function AdminCrewScreen() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({})
  const [isMutatingCrewId, setIsMutatingCrewId] = useState<string | null>(null)
  const {
    data,
    isLoading,
    error,
  } = useAdminCrewManagementQuery()
  const crewRows = data?.crewRows ?? []
  const nganyaOptions = data?.nganyaOptions ?? []

  useEffect(() => {
    if (!error) return
    addToast(error.message || 'Failed to load crew operations data.', 'error')
  }, [addToast, error])

  useEffect(() => {
    if (!crewRows.length) return

    setAssignmentDrafts(
      Object.fromEntries(crewRows.map((crew) => [crew.id, crew.assignedNganyaId || ''])),
    )
  }, [crewRows])

  const filteredCrew = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return crewRows.filter((crew) => {
      const haystack = [
        crew.fullName,
        crew.handle,
        crew.email,
        crew.assignedNganyaName,
        crew.assignedCorridorName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return !needle || haystack.includes(needle)
    })
  }, [crewRows, search])

  const assignMutation = useMutation({
    mutationFn: ({ crewUserId, nganyaId }: { crewUserId: string; nganyaId: string }) =>
      adminDashboardService.assignCrewNganya(crewUserId, nganyaId),
  })

  const unassignMutation = useMutation({
    mutationFn: (crewUserId: string) => adminDashboardService.unassignCrewNganya(crewUserId),
  })

  const handleAssign = async (crewUserId: string) => {
    const nganyaId = assignmentDrafts[crewUserId]
    if (!nganyaId) {
      addToast('Select a nganya before assigning.', 'error')
      return
    }

    setIsMutatingCrewId(crewUserId)

    try {
      await assignMutation.mutateAsync({ crewUserId, nganyaId })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.crewManagement() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview() }),
      ])
      addToast('Crew assignment saved.', 'success')
    } catch (mutationError: any) {
      addToast(mutationError?.message || 'Failed to assign crew nganya.', 'error')
    } finally {
      setIsMutatingCrewId(null)
    }
  }

  const handleUnassign = async (crewUserId: string) => {
    setIsMutatingCrewId(crewUserId)

    try {
      await unassignMutation.mutateAsync(crewUserId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.crewManagement() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.overview() }),
      ])
      addToast('Crew assignment removed.', 'success')
    } catch (mutationError: any) {
      addToast(mutationError?.message || 'Failed to remove crew assignment.', 'error')
    } finally {
      setIsMutatingCrewId(null)
    }
  }

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Admin crew</div>
          <h1 className="mt-1 text-h2 text-white">Crew operations</h1>
          <p className="mt-2 max-w-3xl text-body text-[var(--color-text-secondary)]">
            Map crew to nganyas, watch request status, and identify live or blocked accounts quickly.
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
                  <td colSpan={5} className="px-3 py-8 text-sm text-[var(--color-text-secondary)]">
                    Loading crew...
                  </td>
                </tr>
              ) : filteredCrew.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-sm text-[var(--color-text-secondary)]">
                    No crew accounts match the current search.
                  </td>
                </tr>
              ) : (
                filteredCrew.map((crew) => (
                  <tr key={crew.id} className="bg-[rgba(10,10,15,0.55)] text-sm">
                    <td className="rounded-l-[20px] px-3 py-4 align-top">
                      <div className="font-semibold text-white">{crew.fullName || crew.handle || 'Unnamed crew'}</div>
                      <div className="mt-1 text-[var(--color-text-secondary)]">{crew.email || 'No email'}</div>
                      <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">{crew.id}</div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="space-y-2">
                        <div className="text-white">
                          {crew.assignedNganyaName || 'No nganya assigned'}
                        </div>
                        <div className="text-[var(--color-text-secondary)]">
                          {crew.assignedCorridorName || 'No corridor yet'}
                        </div>
                        {crew.assignedNganyaId ? (
                          <AdminStatusBadge tone={crew.assignmentVerified ? 'green' : 'amber'}>
                            {crew.assignmentVerified ? 'Verified nganya' : 'Pending verification'}
                          </AdminStatusBadge>
                        ) : (
                          <AdminStatusBadge tone="amber">Assignment missing</AdminStatusBadge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      {crew.latestRequestStatus ? (
                        <div className="space-y-2">
                          <AdminStatusBadge
                            tone={
                              crew.latestRequestStatus === 'APPROVED'
                                ? 'green'
                                : crew.latestRequestStatus === 'PENDING'
                                  ? 'accent'
                                  : crew.latestRequestStatus === 'NEEDS_INFO'
                                    ? 'amber'
                                    : 'red'
                            }
                          >
                            {crew.latestRequestStatus}
                          </AdminStatusBadge>
                          <div className="text-caption text-[var(--color-text-tertiary)]">
                            Updated {formatDate(crew.latestRequestUpdatedAt)}
                          </div>
                        </div>
                      ) : (
                        <AdminStatusBadge tone="neutral">No registration</AdminStatusBadge>
                      )}
                    </td>
                    <td className="px-3 py-4 align-top">
                      {crew.activeSessionId ? (
                        <div className="space-y-2">
                          <AdminStatusBadge tone="green">Live now</AdminStatusBadge>
                          <div className="text-caption text-[var(--color-text-tertiary)]">
                            Started {formatDate(crew.activeSessionStartedAt)}
                          </div>
                          <div className="text-caption text-[var(--color-text-tertiary)]">
                            Last ping {formatDate(crew.activeSessionLastPingAt)}
                          </div>
                        </div>
                      ) : (
                        <AdminStatusBadge tone="neutral">Offline</AdminStatusBadge>
                      )}
                    </td>
                    <td className="rounded-r-[20px] px-3 py-4 align-top">
                      <div className="space-y-3">
                        <select
                          value={assignmentDrafts[crew.id] || ''}
                          onChange={(event) =>
                            setAssignmentDrafts((current) => ({
                              ...current,
                              [crew.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                        >
                          <option value="">Select nganya</option>
                          {nganyaOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name} · {option.corridorName}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            className="min-h-[36px] rounded-[14px] px-3 text-xs font-semibold"
                            isLoading={isMutatingCrewId === crew.id}
                            onClick={() => { void handleAssign(crew.id) }}
                          >
                            Save assignment
                          </Button>
                          {crew.assignedNganyaId ? (
                            <Button
                              variant="secondary"
                              className="min-h-[36px] rounded-[14px] px-3 text-xs font-semibold"
                              isLoading={isMutatingCrewId === crew.id}
                              onClick={() => { void handleUnassign(crew.id) }}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
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
