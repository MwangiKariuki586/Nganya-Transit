import { browserSupabase } from '@/shared/supabase/browser-client'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  path: string
  url: string
}

/**
 * Validates image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    }
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 5MB.',
    }
  }

  return { valid: true }
}

/**
 * Generates a unique filename for avatar upload
 */
function generateAvatarFilename(userId: string, file: File): string {
  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'jpg'
  return `${userId}/avatar-${timestamp}.${extension}`
}

/**
 * Uploads avatar image to Supabase Storage
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const filename = generateAvatarFilename(userId, file)

  // Upload to storage
  const { data, error } = await browserSupabase.storage
    .from('crew-avatars')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Avatar upload error:', error)
    throw new Error(error.message || 'Failed to upload avatar')
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = browserSupabase.storage.from('crew-avatars').getPublicUrl(data.path)

  return {
    path: data.path,
    url: publicUrl,
  }
}

/**
 * Deletes avatar from storage
 */
export async function deleteAvatar(path: string): Promise<void> {
  const { error } = await browserSupabase.storage.from('crew-avatars').remove([path])

  if (error) {
    console.error('Avatar deletion error:', error)
    throw new Error('Failed to delete avatar')
  }
}

/**
 * Replaces existing avatar with new one
 */
export async function replaceAvatar(
  file: File,
  userId: string,
  oldPath?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Upload new avatar
  const result = await uploadAvatar(file, userId, onProgress)

  // Delete old avatar if it exists and is in our bucket
  if (oldPath && oldPath.includes('crew-avatars')) {
    try {
      // Extract path from URL if needed
      const pathMatch = oldPath.match(/crew-avatars\/(.+)$/)
      const storagePath = pathMatch ? pathMatch[1] : oldPath
      await deleteAvatar(storagePath)
    } catch (error) {
      console.warn('Failed to delete old avatar:', error)
      // Don't throw - new avatar is already uploaded
    }
  }

  return result
}

/**
 * Creates a preview URL for a file
 */
export function createFilePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revokes a preview URL to free memory
 */
export function revokeFilePreview(url: string): void {
  URL.revokeObjectURL(url)
}


/**
 * Validates cover image before upload
 */
export function validateCoverMediaFile(file: File): { valid: boolean; error?: string; type: 'image' } {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const isImage = imageTypes.includes(file.type)

  if (!isImage) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
      type: 'image',
    }
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 10MB.',
      type: 'image',
    }
  }

  return { valid: true, type: 'image' }
}

/**
 * Generates a unique filename for cover media upload
 */
function generateCoverFilename(userId: string, file: File): string {
  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'jpg'
  return `${userId}/cover-${timestamp}.${extension}`
}

/**
 * Uploads cover image to Supabase Storage
 */
export async function uploadCoverMedia(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult & { type: 'image' }> {
  // Validate file
  const validation = validateCoverMediaFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const filename = generateCoverFilename(userId, file)

  // Upload to storage
  const { data, error } = await browserSupabase.storage
    .from('crew-covers')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Cover media upload error:', error)
    throw new Error(error.message || 'Failed to upload cover media')
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = browserSupabase.storage.from('crew-covers').getPublicUrl(data.path)

  return {
    path: data.path,
    url: publicUrl,
    type: validation.type,
  }
}

/**
 * Deletes cover media from storage
 */
export async function deleteCoverMedia(path: string): Promise<void> {
  const { error } = await browserSupabase.storage.from('crew-covers').remove([path])

  if (error) {
    console.error('Cover media deletion error:', error)
    throw new Error('Failed to delete cover media')
  }
}

/**
 * Replaces existing cover media with new one
 */
export async function replaceCoverMedia(
  file: File,
  userId: string,
  oldPath?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult & { type: 'image' }> {
  // Upload new cover media
  const result = await uploadCoverMedia(file, userId, onProgress)

  // Delete old cover media if it exists and is in our bucket
  if (oldPath && oldPath.includes('crew-covers')) {
    try {
      // Extract path from URL if needed
      const pathMatch = oldPath.match(/crew-covers\/(.+)$/)
      const storagePath = pathMatch ? pathMatch[1] : oldPath
      await deleteCoverMedia(storagePath)
    } catch (error) {
      console.warn('Failed to delete old cover media:', error)
      // Don't throw - new media is already uploaded
    }
  }

  return result
}

// ── Profile gallery ────────────────────────────────────────────────────────

const GALLERY_BUCKET = 'profile-gallery'
const GALLERY_MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const GALLERY_MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

export function validateGalleryFile(file: File): { valid: boolean; error?: string; type: 'image' | 'video' } {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime']

  if (imageTypes.includes(file.type)) {
    if (file.size > GALLERY_MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Image must be under 10MB.', type: 'image' }
    }
    return { valid: true, type: 'image' }
  }

  if (videoTypes.includes(file.type)) {
    if (file.size > GALLERY_MAX_VIDEO_SIZE) {
      return { valid: false, error: 'Video must be under 50MB.', type: 'video' }
    }
    return { valid: true, type: 'video' }
  }

  return { valid: false, error: 'Unsupported file type. Use JPEG, PNG, WebP, MP4, or WebM.', type: 'image' }
}

export async function uploadGalleryItem(
  file: File,
  userId: string,
): Promise<UploadResult & { type: 'image' | 'video' }> {
  const validation = validateGalleryFile(file)
  if (!validation.valid) throw new Error(validation.error)

  const ext = file.name.split('.').pop() || 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await browserSupabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(error.message || 'Failed to upload gallery item')

  const { data: { publicUrl } } = browserSupabase.storage
    .from(GALLERY_BUCKET)
    .getPublicUrl(data.path)

  return { path: data.path, url: publicUrl, type: validation.type }
}

export async function deleteGalleryItem(storagePath: string): Promise<void> {
  const { error } = await browserSupabase.storage
    .from(GALLERY_BUCKET)
    .remove([storagePath])
  if (error) throw new Error(error.message || 'Failed to delete gallery item')
}
