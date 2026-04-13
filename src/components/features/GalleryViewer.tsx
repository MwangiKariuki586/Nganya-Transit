/**
 * GalleryViewer - Premium lightbox for viewing nganya gallery images
 * Features: fullscreen view, navigation, keyboard support, swipe gestures
 */

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

interface GalleryViewerProps {
  images: Array<{ id: string; media_url: string; media_type?: string }>;
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function GalleryViewer({
  images,
  initialIndex,
  isOpen,
  onClose,
}: GalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, goToPrevious, goToNext]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-sm font-medium text-white/90">
          {currentIndex + 1} / {images.length}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4 md:p-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.media_url}
          alt={`Gallery image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-[var(--radius-lg)] shadow-2xl"
        />
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer backdrop-blur-sm"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer backdrop-blur-sm"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Thumbnail Strip (optional, for premium feel) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex gap-2 overflow-x-auto scroll-hidden justify-center">
          {images
            .slice(Math.max(0, currentIndex - 3), currentIndex + 4)
            .map((img, idx) => {
              const actualIndex = Math.max(0, currentIndex - 3) + idx;
              return (
                <button
                  key={img.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(actualIndex);
                  }}
                  className={`shrink-0 w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border-2 transition-all cursor-pointer ${
                    actualIndex === currentIndex
                      ? "border-[var(--color-accent)] scale-110"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <img
                    src={img.media_url}
                    alt={`Thumbnail ${actualIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
