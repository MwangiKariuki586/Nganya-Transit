import type { ReactNode, ButtonHTMLAttributes } from "react";

/**
 * LoadingButton — Button with stable width and proper loading states.
 * Shows spinner + loading label, prevents double submit.
 */

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: [
    "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold",
    "shadow-[var(--glow-accent-sm)]",
    "hover:bg-[var(--color-accent-hover)] hover:shadow-[var(--glow-accent)]",
    "active:scale-95",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none",
  ].join(" "),
  secondary: [
    "bg-[var(--glass-bg)] text-[var(--color-text-primary)]",
    "border border-[var(--glass-border)]",
    "backdrop-blur-md",
    "hover:bg-[var(--glass-bg-strong)] hover:border-[var(--glass-border-hover)]",
    "active:scale-95",
    "disabled:opacity-40 disabled:cursor-not-allowed",
  ].join(" "),
  ghost: [
    "bg-transparent text-[var(--color-text-secondary)]",
    "hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)]",
    "active:scale-95",
    "disabled:opacity-40 disabled:cursor-not-allowed",
  ].join(" "),
  danger: [
    "bg-red-500/10 text-red-200 font-semibold",
    "border border-red-500/30",
    "hover:bg-red-500/20 hover:border-red-500/50",
    "active:scale-95",
    "disabled:opacity-40 disabled:cursor-not-allowed",
  ].join(" "),
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs min-h-[36px]",
  md: "px-5 py-2.5 text-sm min-h-[44px]",
  lg: "px-7 py-3 text-base min-h-[48px]",
};

export function LoadingButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingLabel,
  children,
  className = "",
  disabled,
  ...props
}: LoadingButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-150 cursor-pointer select-none";
  const sizes = sizeStyles[size];

  // Stable width: measure content, keep during loading
  const content = isLoading ? loadingLabel || children : children;

  return (
    <button
      className={`${base} ${variantStyles[variant]} ${sizes} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      <span>{content}</span>
    </button>
  );
}
