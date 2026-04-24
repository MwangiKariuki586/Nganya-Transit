import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compressImage, formatFileSize, type CompressOptions } from '../image-compress'
import { validateImageFile, validateCoverMediaFile, validateGalleryFile } from '@/lib/storage/profile-media'

// ── Helpers ────────────────────────────────────────────────────────────────

function fakeFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

// ── validateImageFile (avatar) ─────────────────────────────────────────────

describe('validateImageFile', () => {
  it('accepts valid JPEG file under 5MB', () => {
    const file = fakeFile('photo.jpg', 2 * 1024 * 1024, 'image/jpeg')
    expect(validateImageFile(file)).toEqual({ valid: true })
  })

  it('accepts valid PNG file', () => {
    const file = fakeFile('photo.png', 1024, 'image/png')
    expect(validateImageFile(file)).toEqual({ valid: true })
  })

  it('accepts valid WebP file', () => {
    const file = fakeFile('photo.webp', 1024, 'image/webp')
    expect(validateImageFile(file)).toEqual({ valid: true })
  })

  it('rejects unsupported file types', () => {
    const file = fakeFile('doc.pdf', 1024, 'application/pdf')
    const result = validateImageFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })

  it('rejects GIF images', () => {
    const file = fakeFile('anim.gif', 1024, 'image/gif')
    const result = validateImageFile(file)
    expect(result.valid).toBe(false)
  })

  it('rejects files exceeding 5MB', () => {
    const file = fakeFile('huge.jpg', 6 * 1024 * 1024, 'image/jpeg')
    const result = validateImageFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('too large')
  })

  it('accepts file exactly at 5MB boundary', () => {
    const file = fakeFile('edge.jpg', 5 * 1024 * 1024, 'image/jpeg')
    expect(validateImageFile(file)).toEqual({ valid: true })
  })
})

// ── validateCoverMediaFile ─────────────────────────────────────────────────

describe('validateCoverMediaFile', () => {
  it('accepts valid image under 10MB', () => {
    const file = fakeFile('cover.jpg', 5 * 1024 * 1024, 'image/jpeg')
    expect(validateCoverMediaFile(file)).toEqual({ valid: true, type: 'image' })
  })

  it('rejects image over 10MB', () => {
    const file = fakeFile('big.png', 11 * 1024 * 1024, 'image/png')
    const result = validateCoverMediaFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('too large')
  })

  it('rejects non-image types', () => {
    const file = fakeFile('video.mp4', 1024, 'video/mp4')
    const result = validateCoverMediaFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid file type')
  })

  it('always returns type "image"', () => {
    const valid = validateCoverMediaFile(fakeFile('ok.webp', 1024, 'image/webp'))
    const invalid = validateCoverMediaFile(fakeFile('bad.txt', 1024, 'text/plain'))
    expect(valid.type).toBe('image')
    expect(invalid.type).toBe('image')
  })
})

// ── validateGalleryFile ────────────────────────────────────────────────────

describe('validateGalleryFile', () => {
  it('accepts JPEG image under 10MB', () => {
    const file = fakeFile('gallery.jpg', 5 * 1024 * 1024, 'image/jpeg')
    expect(validateGalleryFile(file)).toEqual({ valid: true, type: 'image' })
  })

  it('accepts MP4 video under 50MB', () => {
    const file = fakeFile('clip.mp4', 30 * 1024 * 1024, 'video/mp4')
    expect(validateGalleryFile(file)).toEqual({ valid: true, type: 'video' })
  })

  it('accepts WebM video under 50MB', () => {
    const file = fakeFile('clip.webm', 10 * 1024 * 1024, 'video/webm')
    expect(validateGalleryFile(file)).toEqual({ valid: true, type: 'video' })
  })

  it('accepts QuickTime video under 50MB', () => {
    const file = fakeFile('clip.mov', 20 * 1024 * 1024, 'video/quicktime')
    expect(validateGalleryFile(file)).toEqual({ valid: true, type: 'video' })
  })

  it('rejects image over 10MB', () => {
    const file = fakeFile('huge.png', 11 * 1024 * 1024, 'image/png')
    const result = validateGalleryFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('under 10MB')
    expect(result.type).toBe('image')
  })

  it('rejects video over 50MB', () => {
    const file = fakeFile('huge.mp4', 51 * 1024 * 1024, 'video/mp4')
    const result = validateGalleryFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('under 50MB')
    expect(result.type).toBe('video')
  })

  it('rejects unsupported file types', () => {
    const file = fakeFile('data.csv', 1024, 'text/csv')
    const result = validateGalleryFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported file type')
  })
})

// ── compressImage ──────────────────────────────────────────────────────────

describe('compressImage', () => {
  it('returns original file when type is not an image', async () => {
    const file = fakeFile('doc.pdf', 5 * 1024 * 1024, 'application/pdf')
    const result = await compressImage(file)
    expect(result).toBe(file)
  })

  it('returns original file when size is already under maxSizeMB', async () => {
    const file = fakeFile('small.jpg', 1 * 1024 * 1024, 'image/jpeg')
    const result = await compressImage(file, { maxSizeMB: 2 })
    expect(result).toBe(file)
  })

  it('falls back to original when Image triggers onerror', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    })

    const MockImage = vi.fn(function (this: HTMLImageElement) {
      setTimeout(() => this.onerror?.(new Event('error')), 0)
    }) as any
    vi.stubGlobal('Image', MockImage)

    const file = fakeFile('mid.jpg', 500 * 1024, 'image/jpeg')
    const result = await compressImage(file, { maxSizeMB: 0.3 })

    expect(result).toBe(file)

    vi.unstubAllGlobals()
  })
})

// ── formatFileSize ─────────────────────────────────────────────────────────

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.50 MB')
  })

  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('formats exactly 1 KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  it('formats exactly 1 MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB')
  })
})
