/**
 * InlineTableLoader — Shows a subtle loading indicator during background refetch.
 * Keeps existing content visible to avoid jitter.
 */

export function InlineTableLoader() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-[18px] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-2 text-sm text-[var(--color-accent)]">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span>Updating...</span>
    </div>
  );
}
