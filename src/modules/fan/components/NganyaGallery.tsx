import { useState } from "react";
import MediaLightbox from "@/components/ui/MediaLightbox";
import { Play } from "lucide-react";

const GALLERY_LIMIT = 30;
const ITEMS_PER_PAGE = 10;

interface GalleryItem {
  id: string;
  media_url: string;
  media_type?: string;
}

interface NganyaGalleryProps {
  items: GalleryItem[];
}

export function NganyaGallery({ items }: NganyaGalleryProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState<{
    src: string;
    type: "image" | "video";
  } | null>(null);

  const displayedItems = items.slice(0, displayCount);
  const hasMoreItems = displayCount < items.length;

  const loadMoreItems = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }, 300);
  };

  if (items.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--glass-border)] py-12 text-[var(--color-text-tertiary)]">
        <span className="text-sm font-medium">No photos yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {displayedItems.map((item) => {
          const isVideo = item.media_type === "video";
          return (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--glass-bg)]"
            >
              {isVideo ? (
                <>
                  <video
                    src={item.media_url}
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-black/50 p-2">
                      <Play className="h-4 w-4 fill-white text-white" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={item.media_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Hover overlay — tap to view */}
              <div className="absolute inset-0 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="View"
                  onClick={() =>
                    setLightbox({
                      src: item.media_url,
                      type: isVideo ? "video" : "image",
                    })
                  }
                  className="absolute inset-0"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMoreItems && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMoreItems}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-tertiary)] border-t-[var(--color-text-primary)]" />
                Loading...
              </>
            ) : (
              `Load More (${items.length - displayCount} remaining)`
            )}
          </button>
        </div>
      )}

      <MediaLightbox
        isOpen={!!lightbox}
        src={lightbox?.src || ""}
        type={lightbox?.type || "image"}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
