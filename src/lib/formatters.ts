export function toNganyaSlug(value: string | null | undefined): string {
  if (!value) return 'nganya'

  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'nganya'
}

export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return 'Just now'

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Just now'

  const diffMs = timestamp - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 1) return 'Just now'
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute')

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour')

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, 'day')

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return formatter.format(diffMonths, 'month')

  const diffYears = Math.round(diffDays / 365)
  return formatter.format(diffYears, 'year')
}

export function formatMonthYear(value: string | Date | null | undefined): string {
  if (!value) return 'Recently'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatHandle(value: string | null | undefined): string {
  const normalized = (value || 'matwana').replace(/^@+/, '').trim()
  return `@${normalized || 'matwana'}`
}

export function getInitials(name: string | null | undefined, fallback: string = 'M'): string {
  if (!name) return fallback

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) return fallback

  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || fallback
}

/**
 * Returns a 2-character uppercase initials string from a handle or name.
 * Used for avatar fallbacks across nav components and profile screens.
 *
 * @param value  - handle or display name (with or without leading @)
 * @param fallback - returned when value is empty (default: "??")
 */
export function getAvatarInitials(
  value: string | null | undefined,
  fallback: string = '??',
): string {
  if (!value) return fallback
  const cleaned = value.replace(/^@+/, '').trim()
  if (!cleaned) return fallback
  return cleaned.substring(0, 2).toUpperCase()
}

/**
 * Unified direction display label for TO_TOWN / FROM_TOWN values
 * and freeform strings containing "town" or "terminal".
 */
export function formatDirectionLabel(
  direction: string | null | undefined,
  corridorName?: string | null,
): string | null {
  if (!direction) return null;
  const upper = direction.toUpperCase();
  if (upper === "TO_TOWN" || upper.includes("TOWN")) return "→ Town";
  if (upper === "FROM_TOWN" || upper.includes("TERMINAL")) return corridorName ? `→ ${corridorName}` : "→ Terminal";
  return direction;
}
