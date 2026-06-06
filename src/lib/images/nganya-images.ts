function escapeSvgText(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function createNganyaPlaceholder(
  name: string,
  corridorName: string | null | undefined = '',
) {
  const safeName = escapeSvgText(name || 'NGANYA')
  const initials = escapeSvgText(
    safeName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'NG',
  )

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-label="${safeName}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c1524" />
          <stop offset="55%" stop-color="#141423" />
          <stop offset="100%" stop-color="#2e0f1d" />
        </linearGradient>
        <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#25f4ee" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#ff2d7a" stop-opacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#bg)" />
      <circle cx="1320" cy="180" r="220" fill="#ff2d7a" opacity="0.14" />
      <circle cx="250" cy="190" r="160" fill="#25f4ee" opacity="0.14" />
      <rect x="110" y="130" width="1380" height="740" rx="48" fill="none" stroke="rgba(255,255,255,0.10)" />
      <rect x="140" y="160" width="520" height="520" rx="36" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.08)" />
      <text x="400" y="455" text-anchor="middle" font-size="180" font-family="Arial, sans-serif" font-weight="700" fill="url(#glow)">${initials}</text>
      <text x="760" y="430" font-size="64" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">${safeName}</text>
      <text x="760" y="510" font-size="30" font-family="Arial, sans-serif" letter-spacing="10" fill="rgba(255,255,255,0.62)">${escapeSvgText(corridorName)}</text>
      <rect x="760" y="565" width="360" height="10" rx="5" fill="url(#glow)" opacity="0.9" />
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

/**
 * Prefer crew profile avatar, then first gallery media, then legacy `image_url`.
 * For cards, use `pickPrimaryNganyaImageUrl(n) ?? ''` so missing data shows the SVG placeholder (not a stock photo).
 */
export function pickPrimaryNganyaImageUrl(nganya: {
  crew_nganyas?: Array<{ profiles?: { avatar_url?: string | null } | { avatar_url?: string | null }[] | null } | null> | null
  nganya_media?: Array<{ media_url?: string | null }> | null
  image_url?: string | null
  profile_photo_url?: string | null
} | null | undefined): string | null {
  if (!nganya) {
    return null
  }
  const crewRows = nganya.crew_nganyas
  if (Array.isArray(crewRows) && crewRows.length > 0) {
    const raw = crewRows[0]?.profiles
    const p = Array.isArray(raw) ? raw[0] : raw
    if (p?.avatar_url) {
      return p.avatar_url
    }
  }
  return (
    nganya.nganya_media?.[0]?.media_url ||
    nganya.image_url ||
    nganya.profile_photo_url ||
    null
  )
}

export function resolveNganyaImageUrl(
  url: string | null | undefined,
  name: string,
  corridorName?: string | null,
) {
  const s = url?.trim()
  if (!s) {
    return createNganyaPlaceholder(name, corridorName)
  }
  // Let the real URL load; <img onError> in ResponsiveNganyaImage swaps to placeholder if it fails
  // (e.g. hotlink 403) — we do not pre-emptively block Instagram or other CDNs.
  return s
}

export function buildNganyaImageSrcSet(
  sourceUrl: string,
  widths: number[],
) {
  if (!/images\.unsplash\.com/i.test(sourceUrl)) {
    return undefined
  }

  return widths
    .map((width) => {
      const url = new URL(sourceUrl)
      url.searchParams.set('auto', 'format')
      url.searchParams.set('fit', 'crop')
      url.searchParams.set('q', '82')
      url.searchParams.set('w', String(width))
      return `${url.toString()} ${width}w`
    })
    .join(', ')
}
