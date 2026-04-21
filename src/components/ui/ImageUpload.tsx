import { useRef, useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Button from "./Button";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  disabled?: boolean;
  maxSizeMB?: number;
  aspectRatio?: "square" | "wide";
  label?: string;
  helperText?: string;
}

export default function ImageUpload({
  currentImageUrl,
  onImageSelect,
  onImageRemove,
  disabled = false,
  maxSizeMB = 5,
  aspectRatio = "square",
  label = "Upload Image",
  helperText,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial preview from current image
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  const handleFileSelect = (file: File) => {
    setError(null);

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Notify parent
    onImageSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageRemove?.();
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const aspectClass =
    aspectRatio === "square" ? "aspect-square" : "aspect-video";

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={`relative ${aspectClass} rounded-[var(--radius-lg)] border-2 border-dashed overflow-hidden transition-all ${
          isDragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
            : previewUrl
              ? "border-[var(--glass-border)]"
              : "border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {previewUrl ? (
          <>
            {/* Preview Image */}
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />

            {/* Overlay on hover */}
            {!disabled && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/60 transition-colors flex items-center justify-center gap-3 opacity-0 hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Replace
                </Button>
                {onImageRemove && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center">
              {disabled ? (
                <Loader2 className="w-6 h-6 text-[var(--color-text-tertiary)] animate-spin" />
              ) : (
                <ImageIcon className="w-6 h-6 text-[var(--color-text-tertiary)]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                {label}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {isDragging
                  ? "Drop image here"
                  : "Click to browse or drag and drop"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && !error && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-error-soft)] border border-[rgba(255,82,82,0.2)]">
          <X className="w-4 h-4 text-[var(--color-error)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--color-error)]">{error}</p>
        </div>
      )}
    </div>
  );
}
