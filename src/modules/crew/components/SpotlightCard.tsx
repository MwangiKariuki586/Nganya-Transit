import { useEffect, useState, forwardRef } from "react";

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
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) =>
        setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const spotlightClasses = isActive
      ? `border-[var(--color-accent)]/60 shadow-[0_0_32px_rgba(255,45,120,0.15),0_0_64px_rgba(255,45,120,0.08)] relative ${
          !prefersReducedMotion ? "animate-pulse" : ""
        }`
      : "border-white/[0.08]";

    return (
      <section
        ref={ref}
        className={`rounded-[28px] bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)] transition-all duration-300 md:p-6 ${spotlightClasses} ${className}`}
      >
        {showRequiredChip && isActive && (
          <div className="absolute -top-2 -right-2 rounded-full bg-[var(--color-accent)] px-2 py-1 text-xs font-semibold text-white">
            REQUIRED
          </div>
        )}
        {children}
      </section>
    );
  },
);

SpotlightCard.displayName = "SpotlightCard";
