import { useCallback, useState } from "react";
import { replaceAvatar, replaceCoverMedia } from "@/lib/storage/profile-media";
import { retryWithBackoff, isNetworkError } from "@/lib/utils/retry";
import { compressImage, formatFileSize } from "@/lib/utils/image-compress";

interface UploadToast {
  info: (title: string, detail?: string) => void;
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
}

interface UseProfileMediaUploadOptions {
  userId: string | undefined;
  existingAvatarUrl?: string | null;
  existingCoverUrl?: string | null;
  existingCoverType?: "image" | "video" | null;
  toast: UploadToast;
  persistAvatar: (url: string) => Promise<void>;
  persistCover: (url: string, type: "image" | "video") => Promise<void>;
  onSuccess?: () => Promise<void>;
}

export function useProfileMediaUpload(options: UseProfileMediaUploadOptions) {
  const { userId, toast, persistAvatar, persistCover, onSuccess } = options;

  // Avatar state
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(options.existingAvatarUrl ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);

  // Cover state
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(options.existingCoverUrl ?? null);
  const [coverPreviewType, setCoverPreviewType] = useState<"image" | "video" | null>(options.existingCoverType ?? null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const displayedAvatarSrc = pendingAvatarPreviewUrl || avatarPreviewUrl;
  const currentCoverSrc = coverPreviewUrl || options.existingCoverUrl || "";
  const isUploading = isUploadingAvatar || isUploadingCover;
  const uploadProgress = isUploadingCover ? coverUploadProgress : avatarUploadProgress;

  const handleAvatarSelect = useCallback((file: File) => {
    if (pendingAvatarPreviewUrl) URL.revokeObjectURL(pendingAvatarPreviewUrl);
    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl(URL.createObjectURL(file));
  }, [pendingAvatarPreviewUrl]);

  const handleAvatarDiscard = useCallback(() => {
    if (pendingAvatarPreviewUrl) URL.revokeObjectURL(pendingAvatarPreviewUrl);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
  }, [pendingAvatarPreviewUrl]);

  const handleAvatarConfirm = useCallback(async () => {
    if (!pendingAvatarFile || !pendingAvatarPreviewUrl || !userId) return;

    const avatarFile = pendingAvatarFile;
    const previewUrl = pendingAvatarPreviewUrl;
    const previousAvatarUrl = avatarPreviewUrl;

    setAvatarPreviewUrl(previewUrl);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
    setIsUploadingAvatar(true);
    setAvatarUploadProgress(0);

    const progressInterval = setInterval(() => {
      setAvatarUploadProgress((prev) => (prev >= 85 ? prev : prev + 2));
    }, 100);

    try {
      const fileToUpload = await compressImage(avatarFile, { maxWidthOrHeight: 400, quality: 0.88, maxSizeMB: 1 });
      if (fileToUpload.size < avatarFile.size) {
        toast.info("Avatar compressed", `${formatFileSize(avatarFile.size)} → ${formatFileSize(fileToUpload.size)}`);
      }

      const result = await retryWithBackoff(
        () => replaceAvatar(fileToUpload, userId, options.existingAvatarUrl || undefined),
        { maxAttempts: 3, onRetry: (attempt, error) => { toast.info("Retrying upload...", `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue." : ""}`); } },
      );

      await persistAvatar(result.url);

      clearInterval(progressInterval);
      setAvatarUploadProgress(100);
      setAvatarPreviewUrl(result.url);
      URL.revokeObjectURL(previewUrl);
      toast.success("Avatar updated!");
      await onSuccess?.();
    } catch (err: any) {
      clearInterval(progressInterval);
      setAvatarUploadProgress(0);
      setAvatarPreviewUrl(previousAvatarUrl);
      URL.revokeObjectURL(previewUrl);
      toast.error("Upload failed", isNetworkError(err) ? "Network error." : err.message);
    } finally {
      setIsUploadingAvatar(false);
      setAvatarUploadProgress(0);
    }
  }, [pendingAvatarFile, pendingAvatarPreviewUrl, userId, avatarPreviewUrl, options.existingAvatarUrl, persistAvatar, onSuccess, toast]);

  const handleCoverSelect = useCallback((file: File) => {
    setSelectedCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setCoverPreviewType("image");
  }, []);

  const handleCoverDiscard = useCallback(() => {
    setSelectedCoverFile(null);
    setCoverPreviewUrl(options.existingCoverUrl ?? null);
    setCoverPreviewType(options.existingCoverType ?? null);
  }, [options.existingCoverUrl, options.existingCoverType]);

  const handleCoverConfirm = useCallback(async () => {
    if (!selectedCoverFile || !userId) return;

    setIsUploadingCover(true);
    setCoverUploadProgress(0);

    const progressInterval = setInterval(() => {
      setCoverUploadProgress((prev) => (prev >= 85 ? prev : prev + 2));
    }, 100);

    try {
      const coverToUpload = await compressImage(selectedCoverFile, { maxWidthOrHeight: 1920, quality: 0.85, maxSizeMB: 3 });
      if (coverToUpload.size < selectedCoverFile.size) {
        toast.info("Cover compressed", `${formatFileSize(selectedCoverFile.size)} → ${formatFileSize(coverToUpload.size)}`);
      }

      const result = await retryWithBackoff(
        () => replaceCoverMedia(coverToUpload, userId, options.existingCoverUrl || undefined),
        { maxAttempts: 3, onRetry: (attempt, error) => { toast.info("Retrying upload...", `Attempt ${attempt} of 3. ${isNetworkError(error) ? "Network issue." : ""}`); } },
      );

      clearInterval(progressInterval);
      setCoverUploadProgress(100);
      setCoverPreviewUrl(result.url);
      setCoverPreviewType(result.type);

      await persistCover(result.url, result.type);

      setSelectedCoverFile(null);
      toast.success("Cover updated!");
      await onSuccess?.();
    } catch (err: any) {
      clearInterval(progressInterval);
      setCoverUploadProgress(0);
      setCoverPreviewUrl(options.existingCoverUrl ?? null);
      setCoverPreviewType(options.existingCoverType ?? null);
      setSelectedCoverFile(null);
      toast.error("Cover upload failed", isNetworkError(err) ? "Network error." : err.message);
    } finally {
      setIsUploadingCover(false);
    }
  }, [selectedCoverFile, userId, options.existingCoverUrl, options.existingCoverType, persistCover, onSuccess, toast]);

  return {
    avatar: {
      pendingFile: pendingAvatarFile,
      pendingPreviewUrl: pendingAvatarPreviewUrl,
      previewUrl: avatarPreviewUrl,
      displayedSrc: displayedAvatarSrc,
      isUploading: isUploadingAvatar,
      progress: avatarUploadProgress,
      select: handleAvatarSelect,
      discard: handleAvatarDiscard,
      confirm: handleAvatarConfirm,
    },
    cover: {
      selectedFile: selectedCoverFile,
      previewUrl: coverPreviewUrl,
      previewType: coverPreviewType,
      currentSrc: currentCoverSrc,
      isUploading: isUploadingCover,
      progress: coverUploadProgress,
      select: handleCoverSelect,
      discard: handleCoverDiscard,
      confirm: handleCoverConfirm,
    },
    isUploading,
    uploadProgress,
  };
}
