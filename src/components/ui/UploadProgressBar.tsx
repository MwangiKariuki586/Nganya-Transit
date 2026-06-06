/**
 * UploadProgressBar — Fixed slim progress bar pinned to the top of the viewport.
 *
 * Used during media uploads in profile screens and galleries to give
 * visual feedback without blocking the UI.
 *
 * Renders nothing when `isUploading` is false so callers can always mount it.
 */

interface UploadProgressBarProps {
  isUploading: boolean;
  progress: number; // 0–100
}

export function UploadProgressBar({
  isUploading,
  progress,
}: UploadProgressBarProps) {
  if (!isUploading) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-(--z-nav) h-0.5 bg-black/20 md:top-(--top-nav-height)">
      <div
        className="h-full bg-(--color-accent) transition-[width] duration-150 ease-out"
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
      />
    </div>
  );
}
