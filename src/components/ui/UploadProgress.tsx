import { Upload, X } from "lucide-react";

export interface UploadProgressProps {
  fileName: string;
  progress: number; // 0-100
  onCancel?: () => void;
  size?: string;
  type?: "avatar" | "cover";
}

export default function UploadProgress({
  fileName,
  progress,
  onCancel,
  size,
  type = "avatar",
}: UploadProgressProps) {
  const isComplete = progress >= 100;
  const progressPercent = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="p-4 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] animate-fade-in">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-[var(--color-accent-soft)] flex items-center justify-center">
          <Upload className="w-5 h-5 text-[var(--color-accent)]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* File Info */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {fileName}
              </p>
              {size && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  {size}
                </p>
              )}
            </div>
            {onCancel && !isComplete && (
              <button
                onClick={onCancel}
                className="shrink-0 p-1 hover:bg-[var(--color-error-soft)] rounded transition-colors"
                aria-label="Cancel upload"
              >
                <X className="w-4 h-4 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                isComplete
                  ? "bg-[var(--color-green)]"
                  : "bg-[var(--color-accent)]"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Status Text */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {isComplete ? (
                <span className="text-[var(--color-green)] font-medium">
                  Upload complete
                </span>
              ) : (
                `Uploading ${type}...`
              )}
            </p>
            <p className="text-xs font-mono text-[var(--color-text-tertiary)]">
              {progressPercent}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
