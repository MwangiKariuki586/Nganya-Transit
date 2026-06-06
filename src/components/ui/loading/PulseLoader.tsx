interface PulseLoaderProps {
  label?: string;
  containerClassName?: string;
  dotClassName?: string;
  labelClassName?: string;
}

export function PulseLoader({
  label,
  containerClassName = "",
  dotClassName = "h-8 w-8",
  labelClassName = "",
}: PulseLoaderProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2 ${containerClassName}`.trim()}
    >
      <div
        className={`animate-pulse rounded-full bg-[var(--color-accent)] ${dotClassName}`.trim()}
      />
      {label ? <span className={labelClassName}>{label}</span> : null}
    </div>
  );
}
