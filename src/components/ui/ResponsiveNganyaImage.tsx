import { useMemo, useState } from 'react'
import {
  buildNganyaImageSrcSet,
  createNganyaPlaceholder,
  resolveNganyaImageUrl,
} from '@/lib/images/nganya-images'

interface ResponsiveNganyaImageProps {
  src?: string | null
  alt: string
  /** Shown on generated placeholder SVG; optional. */
  corridorName?: string | null
  className?: string
  variant?: 'compact' | 'standard' | 'feature' | 'detail'
}

const VARIANT_SIZES: Record<NonNullable<ResponsiveNganyaImageProps['variant']>, string> = {
  compact: '56px',
  standard: '(max-width: 767px) 88vw, (max-width: 1023px) 44vw, 320px',
  feature: '(max-width: 767px) 94vw, (max-width: 1279px) 92vw, 1200px',
  detail: '100vw',
}

const VARIANT_WIDTHS: Record<NonNullable<ResponsiveNganyaImageProps['variant']>, number[]> = {
  compact: [112, 224],
  standard: [320, 480, 640, 960],
  feature: [640, 960, 1280, 1600],
  detail: [768, 1024, 1440, 1920],
}

export function ResponsiveNganyaImage({
  src,
  alt,
  corridorName,
  className = '',
  variant = 'standard',
}: ResponsiveNganyaImageProps) {
  const [hasFailed, setHasFailed] = useState(false)
  const resolvedSrc = hasFailed
    ? createNganyaPlaceholder(alt, corridorName)
    : resolveNganyaImageUrl(src, alt, corridorName)

  const srcSet = useMemo(
    () => buildNganyaImageSrcSet(resolvedSrc, VARIANT_WIDTHS[variant]),
    [resolvedSrc, variant],
  )

  return (
    <img
      src={resolvedSrc}
      srcSet={srcSet}
      sizes={VARIANT_SIZES[variant]}
      alt={alt}
      loading={variant === 'feature' || variant === 'detail' ? 'eager' : 'lazy'}
      fetchPriority={variant === 'feature' || variant === 'detail' ? 'high' : 'auto'}
      decoding="async"
      className={className}
      onError={() => {
        setHasFailed(true)
      }}
    />
  )
}
