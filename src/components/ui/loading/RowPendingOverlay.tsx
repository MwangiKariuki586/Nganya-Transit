/**
 * RowPendingOverlay — Shows a pending state overlay on a table row.
 * Prevents interaction while mutation is in progress.
 */

interface RowPendingOverlayProps {
  label?: string;
}

export function RowPendingOverlay({
  label = "Saving...",
}: RowPendingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-[rgba(10,10,15,0.85)] backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm text-[var(--color-accent)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span>{label}</span>
      </div>
    </div>
  );
}
