import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useToast } from "@/components/ui/ToastContainer";
import { retryWithBackoff, isNetworkError } from "@/lib/utils/retry";
import { compressImage, formatFileSize } from "@/lib/utils/image-compress";
import {
  uploadGalleryItem,
  deleteGalleryItem,
} from "@/lib/storage/profile-media";
import {
  getProfileGalleryServerFn,
  addGalleryItemServerFn,
  deleteGalleryItemServerFn,
} from "@/shared/server-fns/profile-gallery";
import MediaLightbox from "@/components/ui/MediaLightbox";
import { ImagePlus, Trash2, Play, Check, X } from "lucide-react";

const GALLERY_LIMIT = 30;

interface GalleryItem {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  storage_path: string;
  sort_order: number;
  created_at: string;
}

// A file staged for upload (not yet saved)
interface StagedItem {
  key: string; // local id
  file: File;
  previewUrl: string;
  type: "image" | "video";
}

interface ProfileGalleryProps {
  userId: string;
}

export function ProfileGallery({ userId }: ProfileGalleryProps) {
  const { session } = useAuthSession();
  const toast = useToast();

  const [allItems, setAllItems] = useState<GalleryItem[]>([]);
  const [displayedItems, setDisplayedItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [staged, setStaged] = useState<StagedItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    type: "image" | "video";
  } | null>(null);

  const ITEMS_PER_PAGE = 10;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfileGalleryServerFn({ data: { userId } })
      .then((items) => {
        setAllItems(items);
        setDisplayedItems(items.slice(0, ITEMS_PER_PAGE));
      })
      .catch(() => toast.error("Failed to load gallery"))
      .finally(() => setIsLoading(false));
  }, [userId]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
  }, [staged]);

  const slotsLeft = GALLERY_LIMIT - allItems.length;
  const canStageMore = slotsLeft - staged.length > 0 && !!session?.user?.id;
  const hasMoreItems = displayedItems.length < allItems.length;

  const loadMoreItems = () => {
    setIsLoadingMore(true);
    // Simulate a small delay for better UX
    setTimeout(() => {
      const currentCount = displayedItems.length;
      const nextItems = allItems.slice(0, currentCount + ITEMS_PER_PAGE);
      setDisplayedItems(nextItems);
      setIsLoadingMore(false);
    }, 300);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const available = slotsLeft - staged.length;
    const toStage = files.slice(0, available);

    if (files.length > available) {
      toast.info(
        "Gallery limit",
        `Only ${available} slot${available !== 1 ? "s" : ""} left.`,
      );
    }

    const newStaged: StagedItem[] = toStage
      .filter((f) => {
        const isImage = f.type.startsWith("image/");
        const isVideo = f.type.startsWith("video/");
        return isImage || isVideo;
      })
      .map((f) => ({
        key: `${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        type: f.type.startsWith("video/") ? "video" : "image",
      }));

    setStaged((prev) => [...prev, ...newStaged]);
  };

  const removeStaged = (key: string) => {
    setStaged((prev) => {
      const item = prev.find((s) => s.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((s) => s.key !== key);
    });
  };

  const discardAll = () => {
    staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setStaged([]);
  };

  const confirmUpload = async () => {
    if (!staged.length || !session?.user?.id) return;

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((p) => (p >= 85 ? p : p + 2));
    }, 100);

    try {
      const uploaded: GalleryItem[] = [];

      for (const s of staged) {
        const toProcess =
          s.type === "image"
            ? await compressImage(s.file, {
                maxWidthOrHeight: 1920,
                quality: 0.85,
                maxSizeMB: 5,
              }).catch(() => s.file)
            : s.file;

        if (s.type === "image" && toProcess.size < s.file.size) {
          toast.info(
            "Compressed",
            `${formatFileSize(s.file.size)} → ${formatFileSize(toProcess.size)}`,
          );
        }

        const result = await retryWithBackoff(
          () => uploadGalleryItem(toProcess, session.user.id),
          {
            maxAttempts: 3,
            onRetry: (attempt, error) => {
              toast.info(
                "Retrying upload...",
                `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue." : ""}`,
              );
            },
          },
        );

        const saved = await retryWithBackoff(
          () =>
            addGalleryItemServerFn({
              data: {
                accessToken: session.access_token ?? "",
                media_url: result.url,
                media_type: result.type,
                storage_path: result.path,
              },
            }),
          { maxAttempts: 3 },
        );

        uploaded.push(saved as GalleryItem);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Revoke previews and clear staged
      staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      setStaged([]);

      // Update both allItems and displayedItems
      const newAllItems = [...allItems, ...uploaded];
      setAllItems(newAllItems);
      setDisplayedItems(
        newAllItems.slice(0, displayedItems.length + uploaded.length),
      );

      toast.success(
        uploaded.length === 1
          ? "Photo added!"
          : `${uploaded.length} items added!`,
      );
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error(
        "Upload failed",
        isNetworkError(err)
          ? "Network error. Please try again."
          : err.message || "An unexpected error occurred.",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!session?.access_token) return;
    setDeletingId(item.id);

    try {
      await deleteGalleryItemServerFn({
        data: { accessToken: session.access_token, itemId: item.id },
      });
      await deleteGalleryItem(item.storage_path).catch(() => {});

      // Update both allItems and displayedItems
      const newAllItems = allItems.filter((i) => i.id !== item.id);
      setAllItems(newAllItems);
      setDisplayedItems((prev) => prev.filter((i) => i.id !== item.id));

      toast.success("Removed from gallery");
    } catch (err: any) {
      toast.error("Failed to remove item", err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const hasStagedItems = staged.length > 0;

  return (
    <section className="mt-8 space-y-4">
      {/* Upload progress bar */}
      {isUploading && (
        <div className="fixed left-0 right-0 top-0 z-[var(--z-nav)] h-0.5 bg-black/20 md:top-[var(--top-nav-height)]">
          <div
            className="h-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-h3">
          Gallery{" "}
          <span className="text-sm text-[var(--color-text-tertiary)]">
            ({allItems.length}/{GALLERY_LIMIT})
          </span>
        </h2>

        <div className="flex items-center gap-2">
          {hasStagedItems && !isUploading && (
            <>
              {/* Discard staged */}
              <button
                type="button"
                aria-label="Discard staged photos"
                onClick={discardAll}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {/* Confirm upload */}
              <button
                type="button"
                aria-label="Confirm upload"
                onClick={confirmUpload}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {/* Add button — only when no staged items and slots available */}
          {!hasStagedItems && canStageMore && (
            <button
              type="button"
              aria-label="Add photos or videos"
              onClick={() => inputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-[var(--glass-bg)]"
            />
          ))}
        </div>
      ) : allItems.length === 0 && staged.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--glass-border)] py-12 text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm font-medium">Add photos & videos</span>
          <span className="text-xs opacity-70">
            Up to {GALLERY_LIMIT} items
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {/* Saved items */}
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--glass-bg)]"
            >
              {item.media_type === "video" ? (
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

              <div className="absolute inset-0 flex items-end justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="View"
                  onClick={() =>
                    setLightbox({ src: item.media_url, type: item.media_type })
                  }
                  className="absolute inset-0"
                />
                <button
                  type="button"
                  aria-label="Delete"
                  disabled={deletingId === item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                  className="relative z-10 ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-500 disabled:opacity-40"
                >
                  {deletingId === item.id ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}

          {/* Staged previews (pending confirmation) */}
          {staged.map((s) => (
            <div
              key={s.key}
              className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--glass-bg)] ring-2 ring-[var(--color-accent)]"
            >
              {s.type === "video" ? (
                <>
                  <video
                    src={s.previewUrl}
                    className="h-full w-full object-cover opacity-70"
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
                  src={s.previewUrl}
                  alt=""
                  className="h-full w-full object-cover opacity-70"
                />
              )}

              {/* Remove this staged item */}
              <button
                type="button"
                aria-label="Remove"
                onClick={() => removeStaged(s.key)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add more slot — visible while staging */}
          {canStageMore && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-lg border border-dashed border-[var(--glass-border)] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              aria-label="Add more"
            >
              <ImagePlus className="mx-auto h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Load More Button */}
      {hasMoreItems && !isLoading && (
        <div className="flex justify-center pt-4">
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
              <>Load More</>
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
    </section>
  );
}
