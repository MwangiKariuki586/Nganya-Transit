/**
 * LatestMessageCard — Communication preview placeholder.
 *
 * Reserves the layout slot for the future chat/messaging system.
 * Renders a graceful placeholder when no messages exist yet.
 * Purely presentational — no hooks, no data fetching.
 */

import { MessageSquare } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LatestMessage {
  preview: string;
  timestamp: string;
}

export interface LatestMessageCardProps {
  latestMessage?: LatestMessage | null;
  /** Whether the inbox CTA should be active */
  inboxEnabled?: boolean;
  onOpenInbox?: () => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LatestMessageCard({
  latestMessage,
  inboxEnabled = false,
  onOpenInbox,
  className = "",
}: LatestMessageCardProps) {
  return (
    <div
      className={`rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 ${className}`}
    >
      {/* Card header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare
            className="h-3.5 w-3.5 shrink-0 text-(--color-text-tertiary)"
            aria-hidden="true"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-(--color-text-tertiary)">
            Latest message
          </span>
        </div>

        {inboxEnabled && onOpenInbox && (
          <button
            type="button"
            onClick={onOpenInbox}
            className="text-xs font-medium text-(--color-accent) hover:underline"
          >
            Open inbox
          </button>
        )}
      </div>

      {latestMessage ? (
        <div>
          <p className="text-sm text-(--color-text-primary) line-clamp-2">
            {latestMessage.preview}
          </p>
          <p className="mt-1 text-xs text-(--color-text-tertiary)">
            {latestMessage.timestamp}
          </p>
        </div>
      ) : (
        <div className="py-1">
          <p className="text-xs font-medium text-(--color-text-secondary)">
            No messages yet
          </p>
          <p className="mt-1 text-xs text-(--color-text-tertiary)">
            Conversation previews will appear here once messaging is enabled
          </p>
        </div>
      )}
    </div>
  );
}
