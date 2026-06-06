/**
 * BottomSheet — Mobile-first overlay sheet.
 * Slides up from bottom with backdrop blur.
 * Used for edit profile, spot confirmation, and other mobile interactions.
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Extra data-* attributes forwarded to the root dialog element (e.g. data-colorway-portal=""). */
  rootProps?: React.HTMLAttributes<HTMLDivElement>;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  rootProps,
}: BottomSheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      sheetRef.current?.focus();
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      {...rootProps}
      className="fixed inset-0 z-[var(--z-modal)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[var(--radius-xl)] bg-[var(--color-bg-surface)] border-t border-[var(--glass-border)] animate-slide-up-sheet overflow-hidden flex flex-col outline-none"
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-[var(--color-line-strong)]" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-4">
            <h3
              id={titleId}
              className="text-h3 text-[var(--color-text-primary)]"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
