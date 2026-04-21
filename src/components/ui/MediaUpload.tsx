import { useState, useRef, type DragEvent } from "react";
import { Upload, X, Image as ImageIcon, Video, Play } from "lucide-react";

interface MediaUploadProps {
  currentMediaUrl?: string | null;
  currentMediaType?: "image" | "video" | null;
  onMediaSelect: (file: File) => void;
  onMediaRemove?: () => void;
  disabled?: boolean;
  maxSizeMB?: number;
  aspectRatio?: "wide" | "ultra-wide";
  label?: string;
  helperText?: string;
  acceptVideo?: boolean;
}

export default function MediaUpload({
  currentMediaUrl,
  currentMediaType,
  onMediaSelect,
  onMediaRemove,
  disabled = false,
  maxSizeMB = 50,
  aspectRatio = "wide",
  label = "Upload Media",
  helperText,
  acceptVideo = true,
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptTypes = acceptVideo
    ? "image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm"
    : "image/jpeg,image/jpg,image/png,image/webp";

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const validateAndSelectFile = (file: File) => {
    setError(null);

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Please upload an image or video file");
      return;
    }

    if (isVideo && !acceptVideo) {
      setError("Video files are not allowed");
      return;
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    onMediaSelect(file);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMediaRemove) {
      onMediaRemove();
    }
  };

  const aspectRatioClass =
    aspectRatio === "ultra-wide" ? "aspect-[21/9]" : "aspect-[16/9]";

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          {label}
        </label>
      )}

      <div
        className={`
          relative w-full ${aspectRatioClass} rounded-[var(--radius-lg)] overflow-hidden
          border-2 transition-all duration-200
          ${
            isDragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--glass-border)] bg-[var(--color-bg-elevated)]"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-[var(--color-accent)]/50"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {currentMediaUrl ? (
          // Preview State
          <div className="relative w-full h-full group">
            {currentMediaType === "video" ? (
              <div className="relative w-full h-full bg-black">
                <video
                  src={currentMediaUrl}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-16 h-16 text-white/80" />
                </div>
              </div>
            ) : (
              <img
                src={currentMediaUrl}
                alt="Cover media"
                className="w-full h-full object-cover"
              />
            )}

            {/* Hover Overlay */}
            {!disabled && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                <button
                  onClick={handleClick}
                  className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white font-semibold hover:bg-[var(--color-accent)]/90 transition-colors"
                >
                  Replace
                </button>
                {onMediaRemove && (
                  <button
                    onClick={handleRemove}
                    className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-error)] text-white font-semibold hover:bg-[var(--color-error)]/90 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          // Empty State
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            {disabled ? (
              <div className="w-12 h-12 border-4 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {acceptVideo ? (
                    <>
                      <ImageIcon className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                      <Video className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                    </>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                    {isDragging ? "Drop to upload" : "Click or drag to upload"}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {helperText ||
                      (acceptVideo
                        ? `Image or Video • Max ${maxSizeMB}MB`
                        : `Image • Max ${maxSizeMB}MB`)}
                  </p>
                </div>
                <Upload className="w-6 h-6 text-[var(--color-accent)]" />
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-error)]">
          <X className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
