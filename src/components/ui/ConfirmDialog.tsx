import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import Button from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "warning",
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[var(--z-modal-backdrop)] animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="w-full max-w-md bg-[var(--color-bg-elevated)] border border-[var(--glass-border)] rounded-lg shadow-[0_0_0_1px_var(--color-accent),var(--glow-accent)] pointer-events-auto animate-scale-in outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="p-4 border-b border-[var(--glass-border)]">
            <div className="flex items-start justify-between gap-3">
              <h2
                id={titleId}
                className="text-lg font-semibold text-[var(--color-text-primary)]"
              >
                {title}
              </h2>
              <button
                onClick={onCancel}
                className="shrink-0 p-1 hover:bg-[var(--glass-bg)] rounded transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-[var(--glass-border)] flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button
              variant={variant === "danger" ? "primary" : "primary"}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
