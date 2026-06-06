import { CardSkeleton } from "../Skeleton";

export function DiscoverSkeleton() {
  return (
    <div className="page-container pt-8 pb-16 md:pt-10 space-y-8 md:space-y-10">
      {/* Hero */}
      <section className="space-y-1">
        <div className="h-4 w-14 animate-skeleton rounded-[var(--radius-sm)] bg-[var(--glass-bg)]" />
        <div className="h-10 w-56 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        <div className="h-4 w-72 animate-skeleton rounded-[var(--radius-sm)] bg-[var(--glass-bg)]" />
      </section>

      {/* Corridor pills */}
      <section>
        <div className="h-4 w-20 animate-skeleton rounded-[var(--radius-sm)] bg-[var(--glass-bg)] mb-3" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 h-8 w-24 animate-skeleton rounded-full bg-[var(--glass-bg)]"
            />
          ))}
        </div>
      </section>

      {/* Curated strip */}
      <section>
        <div className="h-6 w-36 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)] mb-3" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[260px]">
              <CardSkeleton />
            </div>
          ))}
        </div>
      </section>

      {/* Control bar */}
      <div className="space-y-3 border-b border-[var(--glass-border)] pb-3">
        <div className="h-11 w-full animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)]" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 h-7 w-20 animate-skeleton rounded-full bg-[var(--glass-bg)]"
            />
          ))}
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 h-7 w-24 animate-skeleton rounded-full bg-[var(--glass-bg)]"
            />
          ))}
        </div>
      </div>

      {/* Results grid */}
      <section>
        <div className="h-6 w-48 animate-skeleton rounded-[var(--radius-md)] bg-[var(--glass-bg)] mb-4" />
        <div className="grid-cards">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
