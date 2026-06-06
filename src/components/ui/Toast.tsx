import { useEffect } from "react";
import { X, Check, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({
  id,
  type,
  message,
  description,
  duration = 5000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  const styles = {
    success: {
      bg: "bg-[var(--color-green-soft)]",
      border: "border-[rgba(57,255,20,0.2)]",
      text: "text-[var(--color-green)]",
    },
    error: {
      bg: "bg-[var(--color-error-soft)]",
      border: "border-[rgba(255,82,82,0.2)]",
      text: "text-[var(--color-error)]",
    },
    info: {
      bg: "bg-[var(--color-accent-soft)]",
      border: "border-[var(--color-accent)]/20",
      text: "text-[var(--color-accent)]",
    },
    warning: {
      bg: "bg-[var(--color-warning-soft)]",
      border: "border-[rgba(255,193,7,0.2)]",
      text: "text-[var(--color-warning)]",
    },
  };

  const style = styles[type];

  return (
    <div
      className={`
        ${style.bg} ${style.border} ${style.text}
        border rounded-[var(--radius-lg)] p-4 shadow-lg
        flex items-start gap-3 min-w-[320px] max-w-[420px]
        animate-slide-in-right
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{message}</p>
        {description && (
          <p className="text-xs mt-1 opacity-80">{description}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
