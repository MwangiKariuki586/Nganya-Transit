export function AdminContentLoadingScreen() {
  return (
    <div className="page-container py-8 md:py-10">
      <div className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
        <div className="h-3 w-28 rounded-full bg-white/8" />
        <div className="mt-4 h-10 w-64 rounded-full bg-white/10" />
        <div className="mt-3 h-5 w-full max-w-2xl rounded-full bg-white/6" />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[24px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4"
            >
              <div className="h-3 w-24 rounded-full bg-white/8" />
              <div className="mt-4 h-9 w-20 rounded-full bg-white/10" />
              <div className="mt-3 h-4 w-full rounded-full bg-white/6" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <div className="rounded-[24px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-5">
            <div className="h-3 w-20 rounded-full bg-white/8" />
            <div className="mt-4 h-8 w-56 rounded-full bg-white/10" />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[20px] bg-white/[0.04] p-4">
                  <div className="h-3 w-16 rounded-full bg-white/8" />
                  <div className="mt-3 h-8 w-14 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-5">
            <div className="h-3 w-24 rounded-full bg-white/8" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[18px] bg-white/[0.04] p-4">
                  <div className="h-4 w-32 rounded-full bg-white/10" />
                  <div className="mt-3 h-4 w-full rounded-full bg-white/6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
