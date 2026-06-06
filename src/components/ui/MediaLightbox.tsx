import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

interface MediaLightboxProps {
  isOpen: boolean;
  src: string;
  type: "image" | "video";
  alt?: string;
  onClose: () => void;
}

export default function MediaLightbox({
  isOpen,
  src,
  type,
  alt = "Media preview",
  onClose,
}: MediaLightboxProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] bg-black/92 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
    >
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 md:right-6 md:top-6"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="flex max-h-full max-w-full items-center justify-center animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {type === "video" ? (
            <video
              src={src}
              className="block max-h-[calc(100vh-5rem)] max-w-full rounded-xl object-contain shadow-2xl md:max-h-[calc(100vh-7rem)]"
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={src}
              alt={alt}
              className="block max-h-[calc(100vh-5rem)] max-w-full rounded-xl object-contain shadow-2xl md:max-h-[calc(100vh-7rem)]"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Small trigger button to open lightbox
 */
export function LightboxTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
      aria-label="View full size"
    >
      <ZoomIn className="w-4 h-4" />
    </button>
  );
}
