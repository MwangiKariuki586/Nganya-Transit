import { Link } from "@tanstack/react-router";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { formatDateTime } from "./crew-live-domain";

interface CrewAssignmentCardProps {
  assignment: {
    nganya_id?: string;
    nganya_name?: string;
    corridor_id?: string;
    is_verified?: boolean;
    terminal_label?: string;
  } | null;
  corridorName: string;
  assignmentThumb: string | null;
  assignmentPlateLast4: string | null;
  assignmentSacco: string | null;
  lastLiveAt: string | null;
  isAssignmentExpanded: boolean;
  onToggleExpanded: () => void;
  showAssignmentHelp: boolean;
  onToggleHelp: () => void;
}

export function CrewAssignmentCard({
  assignment,
  corridorName,
  assignmentThumb,
  assignmentPlateLast4,
  assignmentSacco,
  lastLiveAt,
  isAssignmentExpanded,
  onToggleExpanded,
  showAssignmentHelp,
  onToggleHelp,
}: CrewAssignmentCardProps) {
  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-4">
        <div className="h-48 w-full overflow-hidden rounded-[22px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] xl:h-56">
          {assignmentThumb ? (
            <img
              src={assignmentThumb}
              alt={assignment?.nganya_name || "Assigned nganya"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-caption text-[var(--color-text-tertiary)]">
              No image yet
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-[999px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1 text-caption text-[var(--color-text-secondary)]">
              Assigned nganya
            </div>
            <div className="rounded-[999px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1 text-caption text-[var(--color-text-secondary)]">
              {corridorName}
            </div>
            <div
              className={`rounded-[999px] border px-3 py-1 text-caption ${
                assignment?.is_verified
                  ? "border-[var(--glass-border)] bg-transparent text-[var(--color-success)]"
                  : "border-[var(--glass-border)] bg-transparent text-[var(--color-warning)]"
              }`}
            >
              {assignment?.is_verified ? "Verified" : "Pending"}
            </div>
            {assignment && (
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--glass-border)] text-[var(--color-text-tertiary)] transition-transform hover:border-[var(--glass-border-hover)]"
                onClick={onToggleExpanded}
                aria-label={
                  isAssignmentExpanded ? "Collapse details" : "Expand details"
                }
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${isAssignmentExpanded ? "rotate-180" : "rotate-0"}`}
                />
              </button>
            )}
          </div>

          <h2 className="mt-3 text-h2 text-white">
            {assignment?.nganya_name || "Assignment missing"}
          </h2>

          {assignment ? (
            <>
              {!isAssignmentExpanded && (
                <div className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">
                      Plate hint
                    </span>
                    <span>
                      {assignmentPlateLast4
                        ? `****${assignmentPlateLast4}`
                        : "Not available"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">
                      SACCO
                    </span>
                    <span>{assignmentSacco || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">
                      Last live
                    </span>
                    <span>{formatDateTime(lastLiveAt) || "Never"}</span>
                  </div>
                </div>
              )}

              {isAssignmentExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                    <div className="text-caption text-[var(--color-text-tertiary)]">
                      Plate hint
                    </div>
                    <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {assignmentPlateLast4
                        ? `****${assignmentPlateLast4}`
                        : "Not available"}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                    <div className="text-caption text-[var(--color-text-tertiary)]">
                      SACCO
                    </div>
                    <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {assignmentSacco || "Not provided"}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                    <div className="text-caption text-[var(--color-text-tertiary)]">
                      Last live
                    </div>
                    <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {formatDateTime(lastLiveAt) ||
                        "No previous live session yet"}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="mt-4 w-full text-center text-sm text-[var(--color-accent)]"
                onClick={onToggleHelp}
              >
                Wrong assignment?
              </button>

              {showAssignmentHelp ? (
                <div className="mt-2 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  Share your crew account email with a MATWANA admin if this
                  nganya or route terminal is incorrect.
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-4 rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--color-warning)]" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">
                    No assigned nganya yet
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Complete crew setup before going Live.
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/crew"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-[16px] border border-[var(--glass-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-all hover:border-[var(--glass-border-hover)]"
                    >
                      Complete crew setup
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
