import { forwardRef, useEffect, useState } from "react";

interface SpotlightCardProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
  showRequiredChip?: boolean;
}

export const SpotlightCard = forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ children, isActive, className = "", showRequiredChip = false }, ref) => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
      if (typeof window === "undefined") return;

      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (event: MediaQueryListEvent) =>
        setPrefersReducedMotion(event.matches);

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const spotlightClasses = isActive
      ? "relative border-[var(--color-accent)]/55 shadow-[0_16px_42px_var(--theme-accent-subtle),0_0_0_1px_var(--color-accent-border)]"
      : "border-white/[0.08]";

    return (
      <section
        ref={ref}
        className={`rounded-[28px] border bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)] transition-all duration-300 md:p-6 ${spotlightClasses} ${className}`}
      >
        {showRequiredChip && isActive ? (
          <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--color-accent)]">
            {!prefersReducedMotion ? (
              <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
            ) : null}
            REQUIRED
          </div>
        ) : null}
        {children}
      </section>
    );
  },
);

SpotlightCard.displayName = "SpotlightCard";
