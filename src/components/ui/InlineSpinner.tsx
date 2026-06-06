interface InlineSpinnerProps {
  className?: string;
}

export default function InlineSpinner({ className = "h-3.5 w-3.5" }: InlineSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current/30 border-t-current ${className}`}
    />
  );
}
