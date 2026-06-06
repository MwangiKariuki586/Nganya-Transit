/**
 * PremiumGallery - Infinite scrolling gallery with premium feel
 * Features: paginated loading, internal scroll, loading states, lightbox integration
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import GalleryViewer from "./GalleryViewer";
import { getNganyaMediaPaginated } from "@/lib/queries/discover";

interface GalleryImage {
  id: string;
  media_url: string;
  media_type?: string;
}

interface PremiumGalleryProps {
  nganyaId: string;
  initialImages?: GalleryImage[];
  pageSize?: number;
}

export default function PremiumGallery({
  nganyaId,
  initialImages = [],
  pageSize = 10,
}: PremiumGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>(
    initialImages.slice(0, pageSize),
  );
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialImages.length > pageSize);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [imageLoadStates, setImageLoadStates] = useState<
    Record<string, boolean>
  >({});

  const sentinelRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Load next page of images
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const nextBatch = await getNganyaMediaPaginated(nganyaId, page, pageSize);

      if (nextBatch.length > 0) {
        setImages((prev) => [...prev, ...nextBatch]);
        setPage((prev) => prev + 1);
        setHasMore(nextBatch.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more images:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, pageSize, nganyaId]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !galleryRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        root: galleryRef.current,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const handleImageLoad = (imageId: string) => {
    setImageLoadStates((prev) => ({ ...prev, [imageId]: true }));
  };

  if (initialImages.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-[var(--color-text-tertiary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
              No gallery drops yet
            </h3>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Photos will appear here as they're uploaded
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Premium Gallery Shell */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden shadow-[var(--glow-accent-sm)]">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 px-4 py-3 bg-[var(--glass-bg)]/95 backdrop-blur-sm border-b border-[var(--glass-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Latest Drops
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin" />
            )}
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {images.length} {images.length === 1 ? "photo" : "photos"}
            </span>
          </div>
        </div>

        {/* Scrollable Gallery Content */}
        <div
          ref={galleryRef}
          className="overflow-y-auto scroll-smooth p-4"
          style={{
            maxHeight: "min(70vh, 800px)",
          }}
        >
          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setViewerIndex(index)}
                className="group relative aspect-square rounded-[var(--radius-md)] overflow-hidden bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--color-accent)] transition-all duration-200 cursor-pointer hover:scale-[1.02]"
              >
                {/* Loading skeleton */}
                {!imageLoadStates[image.id] && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--glass-bg)] to-[var(--color-bg-base)] animate-pulse" />
                )}

                {/* Image */}
                <img
                  src={image.media_url}
                  alt={`Gallery image ${index + 1}`}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    imageLoadStates[image.id] ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => handleImageLoad(image.id)}
                  loading="lazy"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="aspect-square rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--glass-bg)] to-[var(--color-bg-base)] animate-pulse border border-[var(--glass-border)]"
                />
              ))}
            </div>
          )}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-4" />

          {/* End State */}
          {!hasMore && images.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--glass-border)] text-center">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                End of gallery • {images.length}{" "}
                {images.length === 1 ? "photo" : "photos"} total
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Viewer */}
      <GalleryViewer
        images={images}
        initialIndex={viewerIndex ?? 0}
        isOpen={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}
