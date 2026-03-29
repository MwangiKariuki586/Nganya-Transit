import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAdminStore } from "@/stores/useAdminStore";
import type { NganyaRegistrationRequestStatus } from "@/shared/types/nganya-registration";
import {
  ListSkeleton,
  DetailSkeleton,
  LoadingButton,
  InlineTableLoader,
} from "@/components/ui/loading";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatTimeAgo, formatShortId } from "@/lib/admin-utils";

function statusClasses(status: NganyaRegistrationRequestStatus) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "REJECTED":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "NEEDS_INFO":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "PENDING":
    default:
      return "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]";
  }
}

type StatusTab = NganyaRegistrationRequestStatus | "ALL";

const NOTE_TEMPLATES = [
  "Need clearer plate photo",
  "Add side view",
  "Confirm route terminal",
  "Verify SACCO name",
];

export default function AdminRegistrationQueueScreen() {
  const { addToast } = useToast();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [statusTab, setStatusTab] = useState<StatusTab>("PENDING");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [lightboxPhotos, setLightboxPhotos] = useState<Array<{
    id: string;
    url: string;
    alt?: string;
  }> | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isRefetching, setIsRefetching] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Use Zustand store instead of React Query
  const {
    registrations,
    registrationDetail,
    isLoadingRegistrations,
    isLoadingRegistrationDetail,
    registrationsError,
    registrationDetailError,
    fetchRegistrations,
    fetchRegistrationDetail,
    approveRequest,
    reviewRequest,
  } = useAdminStore();

  const requests = registrations || [];
  const selectedRequestData = registrationDetail;
  const isLoading = isLoadingRegistrations;
  const error = registrationsError;
  const selectedRequestError = registrationDetailError;
  const isLoadingDetail = isLoadingRegistrationDetail;

  // Show full skeleton on initial load (no data yet)
  if (isLoading && !registrations) {
    return (
      <div className="page-container py-8 md:py-10">
        <div className="mb-6">
          <div className="text-tag text-[var(--color-accent)]">Admin queue</div>
          <h1 className="text-h2 mt-1 text-white">Nganya registrations</h1>
        </div>
        <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
          <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-4 shadow-[var(--shadow-md)] md:p-5">
            <ListSkeleton items={5} />
          </section>
          <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
            <DetailSkeleton />
          </section>
        </div>
      </div>
    );
  }

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let filtered = requests;

    // Status filter
    if (statusTab !== "ALL") {
      filtered = filtered.filter((req) => req.status === statusTab);
    }

    // Search filter
    if (needle) {
      filtered = filtered.filter((req) => {
        const haystack = [
          req.proposed_name,
          req.profiles?.email,
          req.profiles?.handle,
          req.corridors?.name,
          req.plate_last4,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return sorted;
  }, [requests, statusTab, search, sortOrder]);

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      DRAFT: requests.filter((r) => r.status === "DRAFT").length,
      PENDING: requests.filter((r) => r.status === "PENDING").length,
      NEEDS_INFO: requests.filter((r) => r.status === "NEEDS_INFO").length,
      APPROVED: requests.filter((r) => r.status === "APPROVED").length,
      REJECTED: requests.filter((r) => r.status === "REJECTED").length,
      ALL: requests.length,
    };
  }, [requests]);

  // Fetch registrations on mount
  useEffect(() => {
    void fetchRegistrations(100);
  }, [fetchRegistrations]);

  // Refetch when status tab changes
  useEffect(() => {
    if (requests.length > 0) {
      setIsRefetching(true);
      fetchRegistrations(100).finally(() => setIsRefetching(false));
    }
  }, [statusTab]);

  // Fetch registration detail when selectedRequestId changes
  useEffect(() => {
    if (selectedRequestId) {
      void fetchRegistrationDetail(selectedRequestId);
    }
  }, [selectedRequestId, fetchRegistrationDetail]);

  useEffect(() => {
    if (!error) return;
    addToast(error.message || "Failed to load registration queue.", "error");
  }, [addToast, error]);

  useEffect(() => {
    if (!selectedRequestError) return;
    addToast(
      selectedRequestError.message || "Failed to load request details.",
      "error",
    );
  }, [addToast, selectedRequestError]);

  useEffect(() => {
    if (!filteredRequests.length) {
      setSelectedRequestId(null);
      return;
    }

    setSelectedRequestId((current) =>
      current && filteredRequests.some((request) => request.id === current)
        ? current
        : filteredRequests[0].id,
    );
  }, [filteredRequests]);

  useEffect(() => {
    if (!selectedRequestData?.request) return;
    setReviewNotes(selectedRequestData.request.review_notes || "");
  }, [selectedRequestData]);

  const selectedRequest = selectedRequestData?.request || null;
  const duplicateWarnings = selectedRequestData?.duplicateWarnings || {
    similarNganyas: [],
    matchingPlateHints: [],
  };

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "PENDING").length,
    [requests],
  );

  const handleSelect = async (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  const handleApprove = async () => {
    if (!selectedRequestId) return;
    if (!reviewNotes && selectedRequest?.status === "NEEDS_INFO") {
      addToast("Add notes before approving.", "error");
      return;
    }
    setIsMutating(true);

    try {
      await approveRequest(selectedRequestId, reviewNotes || undefined);
      addToast("Registration approved and mapped.", "success");

      // Auto-advance to next pending
      advanceToNext();
    } catch (mutationError: any) {
      addToast(
        mutationError?.message || "Failed to approve registration request.",
        "error",
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleReview = async (status: "REJECTED" | "NEEDS_INFO") => {
    if (!selectedRequestId) return;

    // Require notes for both actions
    if (!reviewNotes.trim()) {
      addToast(
        `Notes required for ${status === "REJECTED" ? "rejection" : "change request"}.`,
        "error",
      );
      return;
    }

    setIsMutating(true);

    try {
      await reviewRequest(selectedRequestId, status, reviewNotes || undefined);
      addToast(
        status === "NEEDS_INFO"
          ? "Change request sent to crew."
          : "Registration rejected.",
        "success",
      );

      // Auto-advance to next pending
      advanceToNext();
      setShowRejectConfirm(false);
    } catch (mutationError: any) {
      addToast(
        mutationError?.message || "Failed to update registration request.",
        "error",
      );
    } finally {
      setIsMutating(false);
    }
  };

  const advanceToNext = () => {
    const currentIndex = filteredRequests.findIndex(
      (r) => r.id === selectedRequestId,
    );
    if (currentIndex >= 0 && currentIndex < filteredRequests.length - 1) {
      setSelectedRequestId(filteredRequests[currentIndex + 1].id);
    } else if (filteredRequests.length > 1) {
      setSelectedRequestId(filteredRequests[0].id);
    } else {
      setSelectedRequestId(null);
    }
    setReviewNotes("");
  };

  const insertNoteTemplate = (template: string) => {
    setReviewNotes((current) => {
      if (!current.trim()) return template;
      return `${current}\n${template}`;
    });
  };

  const openLightbox = (index: number) => {
    if (!selectedRequest?.nganya_registration_request_media) return;
    const photos = selectedRequest.nganya_registration_request_media.map(
      (media: any) => ({
        id: media.id,
        url: media.media_url,
        alt: selectedRequest.proposed_name,
      }),
    );
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  };

  return (
    <div className="page-container py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Admin queue</div>
          <h1 className="text-h2 mt-1 text-white">Nganya registrations</h1>
          <p className="text-body mt-2 text-[var(--color-text-secondary)]">
            Review pending crew submissions, then approve to create the public
            nganya and map it automatically.
          </p>
        </div>
        <div className="rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          Pending:{" "}
          <span className="font-semibold text-white">{pendingCount}</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* LEFT PANEL: Queue list */}
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-4 shadow-[var(--shadow-md)] md:p-5">
          {/* Status tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                "PENDING",
                "NEEDS_INFO",
                "APPROVED",
                "REJECTED",
                "ALL",
              ] as StatusTab[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusTab(tab)}
                className={`rounded-[16px] border px-3 py-2 text-sm font-semibold transition-all ${
                  statusTab === tab
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)] hover:border-[var(--glass-border-hover)]"
                }`}
              >
                {tab === "ALL" ? "All" : tab.replace("_", " ")}
                <span className="ml-1.5 opacity-70">{statusCounts[tab]}</span>
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="mb-4 space-y-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, crew, corridor, plate..."
              className="w-full rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSortOrder("newest")}
                className={`flex-1 rounded-[14px] border px-3 py-1.5 text-xs transition-all ${
                  sortOrder === "newest"
                    ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]"
                }`}
              >
                Newest
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("oldest")}
                className={`flex-1 rounded-[14px] border px-3 py-1.5 text-xs transition-all ${
                  sortOrder === "oldest"
                    ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]"
                }`}
              >
                Oldest
              </button>
            </div>
          </div>

          {/* Inline refetch loader */}
          {isRefetching && (
            <div className="mb-3">
              <InlineTableLoader />
            </div>
          )}

          {/* Request list */}
          <div className="space-y-3">
            {isLoading ? (
              <ListSkeleton items={5} />
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-6 text-center">
                <div className="text-body-sm text-[var(--color-text-secondary)]">
                  {statusTab === "PENDING"
                    ? "No pending registrations."
                    : `No ${statusTab.toLowerCase().replace("_", " ")} requests.`}
                </div>
                {statusTab === "PENDING" && statusCounts.NEEDS_INFO > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusTab("NEEDS_INFO")}
                    className="mt-3 text-sm text-[var(--color-accent)] hover:underline"
                  >
                    View {statusCounts.NEEDS_INFO} needing info →
                  </button>
                )}
              </div>
            ) : (
              filteredRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => {
                    void handleSelect(request.id);
                  }}
                  disabled={isMutating}
                  className={`relative w-full rounded-[20px] border p-4 text-left transition-all ${
                    request.id === selectedRequestId
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] hover:border-[var(--glass-border-hover)]"
                  } ${isMutating && request.id === selectedRequestId ? "cursor-wait opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {request.proposed_name}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-caption text-[var(--color-text-secondary)]">
                        <span className="truncate">
                          {request.corridors?.name || "Unknown corridor"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-caption text-[var(--color-text-tertiary)]">
                        <span className="truncate">
                          {request.profiles?.handle ||
                            request.profiles?.email ||
                            formatShortId(request.created_by)}
                        </span>
                        <span>•</span>
                        <span>{formatTimeAgo(request.created_at)}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-[999px] border px-2.5 py-1 text-caption ${statusClasses(request.status)}`}
                    >
                      {request.status.replace("_", " ")}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Detail */}
        <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
          {!selectedRequest ? (
            isLoadingDetail ? (
              <DetailSkeleton />
            ) : (
              <div className="py-12 text-center">
                <div className="text-body text-[var(--color-text-secondary)]">
                  Select a request to review.
                </div>
              </div>
            )
          ) : isLoadingDetail && !selectedRequestData ? (
            <DetailSkeleton />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="text-tag text-[var(--color-accent)]">
                    Request detail
                  </div>
                  <h2 className="text-h3 mt-2 text-white">
                    {selectedRequest.proposed_name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-body-sm text-[var(--color-text-secondary)]">
                    <span>
                      {selectedRequest.corridors?.name || "Unknown corridor"}
                    </span>
                    <span>•</span>
                    <span>
                      Plate: {selectedRequest.plate_last4 || "Not provided"}
                    </span>
                    <span>•</span>
                    <CopyButton text={selectedRequest.id} label="ID" />
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-[999px] border px-3 py-1.5 text-caption ${statusClasses(selectedRequest.status)}`}
                >
                  {selectedRequest.status.replace("_", " ")}
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Submission info */}
                <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
                  <div className="text-caption text-[var(--color-text-tertiary)]">
                    Crew submission
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <div>
                      Name:{" "}
                      <span className="text-white">
                        {selectedRequest.proposed_name}
                      </span>
                    </div>
                    <div>
                      Route:{" "}
                      <span className="text-white">
                        {selectedRequest.corridors?.name || "Unknown corridor"}
                      </span>
                    </div>
                    <div>
                      SACCO:{" "}
                      <span className="text-white">
                        {selectedRequest.sacco || "Not provided"}
                      </span>
                    </div>
                    <div>
                      Tags:{" "}
                      <span className="text-white">
                        {selectedRequest.tags?.length
                          ? selectedRequest.tags.join(", ")
                          : "None"}
                      </span>
                    </div>
                    <div>
                      Submitted:{" "}
                      <span
                        className="text-white"
                        title={new Date(
                          selectedRequest.created_at,
                        ).toLocaleString()}
                      >
                        {formatTimeAgo(selectedRequest.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duplicate warnings */}
                <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
                  <div className="text-caption text-[var(--color-text-tertiary)]">
                    Duplicate warnings
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    {duplicateWarnings.matchingPlateHints.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-amber-200">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Strong match
                        </div>
                        <div className="mt-2 space-y-2">
                          {duplicateWarnings.matchingPlateHints.map(
                            (item: any) => (
                              <div
                                key={item.id}
                                className="rounded-[14px] border border-amber-500/20 bg-amber-500/5 p-3"
                              >
                                <div className="font-medium text-white">
                                  {item.proposed_name}
                                </div>
                                <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                                  {item.status} • Plate: {item.plate_last4}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {duplicateWarnings.similarNganyas.length > 0 && (
                      <div>
                        <div className="font-semibold text-[var(--color-text-secondary)]">
                          Possible match
                        </div>
                        <div className="mt-2 space-y-2">
                          {duplicateWarnings.similarNganyas.map(
                            (nganya: any) => (
                              <div
                                key={nganya.id}
                                className="rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-3"
                              >
                                <div className="text-white">{nganya.name}</div>
                                <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                                  Existing nganya
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                    {duplicateWarnings.matchingPlateHints.length === 0 &&
                      duplicateWarnings.similarNganyas.length === 0 && (
                        <div className="text-[var(--color-text-secondary)]">
                          No duplicates detected.
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div>
                <div className="text-caption text-[var(--color-text-tertiary)]">
                  Photos (
                  {selectedRequest.nganya_registration_request_media?.length ||
                    0}
                  )
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {selectedRequest.nganya_registration_request_media?.map(
                    (media: any, index: number) => (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => openLightbox(index)}
                        className="group relative h-40 w-full overflow-hidden rounded-[18px] border border-[var(--glass-border)] transition-all hover:border-[var(--color-accent)] hover:shadow-[var(--glow-accent-sm)]"
                      >
                        <img
                          src={media.media_url}
                          alt={`${selectedRequest.proposed_name} photo ${index + 1}`}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                          <svg
                            className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                            />
                          </svg>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Review notes - only show for actionable statuses */}
              {(selectedRequest.status === "PENDING" ||
                selectedRequest.status === "NEEDS_INFO") && (
                <div>
                  <label className="text-caption text-[var(--color-text-tertiary)]">
                    Review notes
                    <span className="ml-2 text-amber-200">
                      (Required for Request changes / Reject)
                    </span>
                  </label>

                  {/* Note templates */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {NOTE_TEMPLATES.map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => insertNoteTemplate(template)}
                        disabled={isMutating}
                        className="rounded-[12px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] disabled:opacity-40"
                      >
                        + {template}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    rows={4}
                    disabled={isMutating}
                    className="mt-2 w-full rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
                    placeholder="Add context for approval, rejection, or requested changes."
                  />
                </div>
              )}

              {/* Action buttons - only show for actionable statuses */}
              {(selectedRequest.status === "PENDING" ||
                selectedRequest.status === "NEEDS_INFO") && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <LoadingButton
                    variant="primary"
                    className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                    isLoading={isMutating}
                    loadingLabel="Approving..."
                    onClick={() => {
                      void handleApprove();
                    }}
                  >
                    Approve and map
                  </LoadingButton>
                  <LoadingButton
                    variant="secondary"
                    className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                    isLoading={isMutating}
                    loadingLabel="Requesting..."
                    onClick={() => {
                      void handleReview("NEEDS_INFO");
                    }}
                  >
                    Request changes
                  </LoadingButton>
                  <LoadingButton
                    variant="danger"
                    className="min-h-[48px] rounded-[18px] px-4 text-sm font-semibold"
                    isLoading={isMutating}
                    loadingLabel="Rejecting..."
                    onClick={() => setShowRejectConfirm(true)}
                  >
                    Reject
                  </LoadingButton>
                </div>
              )}

              {/* Status message for completed requests */}
              {(selectedRequest.status === "APPROVED" ||
                selectedRequest.status === "REJECTED") && (
                <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4 text-center">
                  <div className="text-body-sm text-[var(--color-text-secondary)]">
                    {selectedRequest.status === "APPROVED"
                      ? "This registration has been approved and mapped."
                      : "This registration has been rejected."}
                  </div>
                  {selectedRequest.review_notes && (
                    <div className="mt-3 rounded-[14px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-3 text-left text-sm text-[var(--color-text-secondary)]">
                      <div className="text-caption text-[var(--color-text-tertiary)]">
                        Review notes:
                      </div>
                      <div className="mt-1 text-white">
                        {selectedRequest.review_notes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Lightbox */}
      {lightboxPhotos && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxPhotos(null)}
        />
      )}

      {/* Reject confirmation modal */}
      {showRejectConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => !isMutating && setShowRejectConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.98)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-h4 text-white">Confirm rejection</h3>
            <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
              This will reject the registration request. The crew will be
              notified.
            </p>
            {!reviewNotes.trim() && (
              <p className="mt-2 text-sm text-amber-200">
                Please add notes explaining the rejection reason.
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <LoadingButton
                variant="danger"
                isLoading={isMutating}
                loadingLabel="Rejecting..."
                onClick={() => {
                  void handleReview("REJECTED");
                }}
                disabled={!reviewNotes.trim()}
                className="flex-1"
              >
                Confirm reject
              </LoadingButton>
              <LoadingButton
                variant="secondary"
                onClick={() => setShowRejectConfirm(false)}
                disabled={isMutating}
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
