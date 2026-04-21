import { useState, useEffect } from "react";
import { copyToClipboard } from "@/lib/admin-utils";
import { useToast } from "./ToastContainer";

interface PhotoLightboxProps {
  photos: Array<{ id: string; url: string; alt?: string }>;
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoLightbox({
  photos,
  initialIndex = 0,
  onClose,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { addToast } = useToast();

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
      if (e.key === "ArrowRight")
        setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, photos.length]);

  const handleCopyUrl = () => {
    copyToClipboard(currentPhoto.url);
    addToast("Photo URL copied", "success");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentPhoto.url}
          alt={currentPhoto.alt || "Photo"}
          className="max-h-[90vh] max-w-[90vw] rounded-[20px] border border-[var(--glass-border)] object-contain"
        />

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.95)] px-4 py-2 backdrop-blur-md">
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1))
            }
            className="rounded-[12px] p-2 text-white transition-colors hover:bg-[var(--glass-bg)]"
            title="Previous (←)"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <span className="text-sm text-[var(--color-text-secondary)]">
            {currentIndex + 1} / {photos.length}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0))
            }
            className="rounded-[12px] p-2 text-white transition-colors hover:bg-[var(--glass-bg)]"
            title="Next (→)"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          <div className="mx-2 h-4 w-px bg-[var(--glass-border)]" />

          <button
            type="button"
            onClick={handleCopyUrl}
            className="rounded-[12px] p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--glass-bg)] hover:text-white"
            title="Copy URL"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          <a
            href={currentPhoto.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[12px] p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--glass-bg)] hover:text-white"
            title="Open original"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-[12px] bg-[rgba(10,10,15,0.95)] p-2 text-white backdrop-blur-md transition-colors hover:bg-[var(--glass-bg)]"
          title="Close (Esc)"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
