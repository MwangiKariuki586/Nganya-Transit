import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { nganyaRegistrationService } from '@/features/nganya-registration/services/nganya-registration-service'
import type { NganyaRegistrationRequestStatus } from '@/shared/types/nganya-registration'

function statusClasses(status: NganyaRegistrationRequestStatus) {
  switch (status) {
    case 'APPROVED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    case 'REJECTED':
      return 'border-red-500/30 bg-red-500/10 text-red-200'
    case 'NEEDS_INFO':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    case 'PENDING':
    default:
      return 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
  }
}

export default function AdminRegistrationQueueScreen() {
  const [requests, setRequests] = useState<any[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedRequestData, setSelectedRequestData] = useState<any>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRequests = async (preferredRequestId?: string | null) => {
    setIsLoading(true)
    setError(null)

    try {
      const nextRequests = await nganyaRegistrationService.listAdminRequests({ limit: 50 })
      setRequests(nextRequests)
      const nextSelectedId = preferredRequestId || selectedRequestId || nextRequests[0]?.id || null
      setSelectedRequestId(nextSelectedId)

      if (nextSelectedId) {
        const details = await nganyaRegistrationService.getAdminReviewData(nextSelectedId)
        setSelectedRequestData(details)
        setReviewNotes(details.request.review_notes || '')
      } else {
        setSelectedRequestData(null)
        setReviewNotes('')
      }
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load registration queue.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [])

  const selectedRequest = selectedRequestData?.request || null
  const duplicateWarnings = selectedRequestData?.duplicateWarnings || { similarNganyas: [], matchingPlateHints: [] }

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === 'PENDING').length,
    [requests],
  )

  const handleSelect = async (requestId: string) => {
    setSelectedRequestId(requestId)
    setError(null)

    try {
      const details = await nganyaRegistrationService.getAdminReviewData(requestId)
      setSelectedRequestData(details)
      setReviewNotes(details.request.review_notes || '')
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load request details.')
    }
  }

  const handleApprove = async () => {
    if (!selectedRequestId) return
    setIsMutating(true)
    setError(null)

    try {
      await nganyaRegistrationService.approveRequest({
        requestId: selectedRequestId,
        reviewNotes,
      })
      await loadRequests(selectedRequestId)
    } catch (mutationError: any) {
      setError(mutationError?.message || 'Failed to approve registration request.')
    } finally {
      setIsMutating(false)
    }
  }

  const handleReview = async (status: 'REJECTED' | 'NEEDS_INFO') => {
    if (!selectedRequestId) return
    setIsMutating(true)
    setError(null)

    try {
      await nganyaRegistrationService.reviewRequest({
        requestId: selectedRequestId,
        status,
        reviewNotes,
      })
      await loadRequests(selectedRequestId)
    } catch (mutationError: any) {
      setError(mutationError?.message || 'Failed to update registration request.')
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Admin queue</div>
          <h1 className="text-h2 mt-1 text-white">Nganya registrations</h1>
          <p className="text-body mt-2 text-[var(--color-text-secondary)]">
            Review pending crew submissions, then approve to create the public nganya and map it automatically.
          </p>
        </div>
        <div className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          Pending: <span className="font-semibold text-white">{pendingCount}</span>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-[20px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-4 shadow-[var(--shadow-md)] md:p-5">
          <div className="text-caption text-[var(--color-text-tertiary)]">Requests</div>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-body-sm text-[var(--color-text-secondary)]">Loading queue...</div>
            ) : requests.length === 0 ? (
              <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 text-body-sm text-[var(--color-text-secondary)]">
                No registration requests yet.
              </div>
            ) : requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => { void handleSelect(request.id) }}
                className={`w-full rounded-[20px] border p-4 text-left transition-all ${
                  request.id === selectedRequestId
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : 'border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] hover:border-[var(--glass-border-hover)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">{request.proposed_name}</div>
                    <div className="mt-1 text-body-sm text-[var(--color-text-secondary)]">
                      {request.corridors?.name || 'Unknown corridor'}
                    </div>
                    <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                      Crew: {request.profiles?.full_name || request.profiles?.handle || request.created_by}
                    </div>
                  </div>
                  <span className={`rounded-[999px] border px-2.5 py-1 text-caption ${statusClasses(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          {!selectedRequest ? (
            <div className="text-body-sm text-[var(--color-text-secondary)]">Select a request to review.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-tag text-[var(--color-accent)]">Request detail</div>
                  <h2 className="text-h3 mt-2 text-white">{selectedRequest.proposed_name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-body-sm text-[var(--color-text-secondary)]">
                    <span>{selectedRequest.corridors?.name || 'Unknown corridor'}</span>
                    <span>|</span>
                    <span>Status: {selectedRequest.status}</span>
                    <span>|</span>
                    <span>Plate hint: {selectedRequest.plate_last4 || 'Not provided'}</span>
                  </div>
                </div>
                <span className={`rounded-[999px] border px-3 py-1.5 text-caption ${statusClasses(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
                  <div className="text-caption text-[var(--color-text-tertiary)]">Crew submission</div>
                  <div className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <div>Name: <span className="text-white">{selectedRequest.proposed_name}</span></div>
                    <div>Route: <span className="text-white">{selectedRequest.corridors?.name || 'Unknown corridor'}</span></div>
                    <div>SACCO: <span className="text-white">{selectedRequest.sacco || 'Not provided'}</span></div>
                    <div>Tags: <span className="text-white">{selectedRequest.tags?.length ? selectedRequest.tags.join(', ') : 'None'}</span></div>
                    <div>Submitted: <span className="text-white">{new Date(selectedRequest.created_at).toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
                  <div className="text-caption text-[var(--color-text-tertiary)]">Duplicate warnings</div>
                  <div className="mt-3 space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div>
                      <div className="font-semibold text-white">Similar names on this corridor</div>
                      {duplicateWarnings.similarNganyas.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {duplicateWarnings.similarNganyas.map((nganya: any) => (
                            <div key={nganya.id}>{nganya.name}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2">None found.</div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white">Matching plate hints</div>
                      {duplicateWarnings.matchingPlateHints.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {duplicateWarnings.matchingPlateHints.map((request: any) => (
                            <div key={request.id}>{request.proposed_name} ({request.status})</div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2">None found.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-caption text-[var(--color-text-tertiary)]">Photos</div>
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {selectedRequest.nganya_registration_request_media?.map((media: any) => (
                    <img
                      key={media.id}
                      src={media.media_url}
                      alt={selectedRequest.proposed_name}
                      className="h-40 w-full rounded-[18px] border border-[var(--glass-border)] object-cover"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-caption text-[var(--color-text-tertiary)]">Review notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                  placeholder="Add context for approval, rejection, or requested changes."
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                  isLoading={isMutating}
                  onClick={() => { void handleApprove() }}
                >
                  Approve and map
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                  isLoading={isMutating}
                  onClick={() => { void handleReview('NEEDS_INFO') }}
                >
                  Request changes
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                  isLoading={isMutating}
                  onClick={() => { void handleReview('REJECTED') }}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
