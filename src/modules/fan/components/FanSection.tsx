import type { ReactNode } from "react";

interface FanSectionProps {
  title: ReactNode;
  children: ReactNode;
  headerContent?: ReactNode;
  className?: string;
  titleClassName?: string;
  withDivider?: boolean;
}

export function FanSection({
  title,
  children,
  headerContent,
  className = "",
  titleClassName = "",
  withDivider = true,
}: FanSectionProps) {
  return (
    <>
      {withDivider ? (
        <div className="mt-8 border-t border-[var(--color-line)]" />
      ) : null}
      <section className={`mt-8 ${className}`.trim()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={`text-h3 ${titleClassName}`.trim()}>{title}</h2>
          {headerContent}
        </div>
        {children}
      </section>
    </>
  );
}
