export function CrewShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <header className="sticky top-0 z-[var(--z-nav)] border-b border-[var(--glass-border)] bg-[var(--color-bg-base)]/85 backdrop-blur-xl">
        <div className="page-container flex h-[var(--top-nav-height)] items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-full bg-white/8" />
            <div className="h-3 w-24 rounded-full bg-white/6" />
          </div>
          <div className="h-10 w-40 rounded-[16px] bg-white/6" />
        </div>
      </header>

      <main className="flex-1">
        <div className="page-container max-w-5xl py-10">
          <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[var(--shadow-md)]">
            <div className="h-4 w-28 rounded-full bg-[var(--color-accent)]/20" />
            <div className="mt-4 h-10 w-64 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-full max-w-xl rounded-full bg-white/6" />
            <div className="mt-2 h-4 w-full max-w-lg rounded-full bg-white/6" />

            <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_390px]">
              <div className="space-y-4">
                <div className="h-64 rounded-[24px] border border-[var(--glass-border)] bg-white/5" />
                <div className="h-40 rounded-[24px] border border-[var(--glass-border)] bg-white/5" />
              </div>
              <div className="space-y-4">
                <div className="h-48 rounded-[24px] border border-[var(--glass-border)] bg-white/5" />
                <div className="h-32 rounded-[24px] border border-[var(--glass-border)] bg-white/5" />
                <div className="h-36 rounded-[24px] border border-[var(--glass-border)] bg-white/5" />
                <div className="h-12 rounded-[18px] bg-[var(--color-accent)]/30" />
              </div>
            </div>

            <div className="mt-5 text-sm text-[var(--color-text-secondary)]">
              Checking your setup...
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
