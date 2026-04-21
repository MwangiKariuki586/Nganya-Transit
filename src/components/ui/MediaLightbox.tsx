import { useEffect } from "react";
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[var(--z-modal-backdrop)] animate-fade-in"
        onClick={onClose}
      />

      {/* Content */}
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-primary)] hover:bg-[var(--glass-bg-strong)] transition-colors z-10"
          aria-label="Close preview"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media */}
        <div className="max-w-5xl w-full max-h-[90vh] animate-scale-in">
          {type === "video" ? (
            <video
              src={src}
              className="w-full max-h-[90vh] rounded-lg object-contain"
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
              className="w-full max-h-[90vh] rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </>
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
