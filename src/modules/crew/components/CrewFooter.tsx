export function CrewFooter() {
  return (
    <footer className="border-t border-[var(--glass-border)] bg-[var(--color-bg-elevated)]/90">
      <div className="page-container flex flex-col gap-2 py-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div>
          <div className="text-tag text-[var(--color-accent)]">Matwana Crew</div>
          <div className="text-body-sm mt-1 text-[var(--color-text-secondary)]">
            Keep pings live, seats honest, and the route moving.
          </div>
        </div>

        <div className="text-caption text-[var(--color-text-tertiary)]">
          Live updates every 15s
        </div>
      </div>
    </footer>
  )
}
