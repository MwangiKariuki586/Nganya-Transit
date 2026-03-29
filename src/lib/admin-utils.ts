/**
 * Admin utility functions for formatting and display
 */

export function formatShortId(id: string | null | undefined): string {
  if (!id) return 'N/A'
  return id.slice(0, 8)
}

export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: create temp textarea
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    })
  }
}

export function formatTimeAgo(value: string | Date | null | undefined): string {
  if (!value) return 'Unknown'

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Unknown'

  const diffMs = Date.now() - timestamp
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return `${diffSeconds}s ago`
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`

  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}y ago`
}

export function getLiveHealthTone(lastPingAt: string | null): 'green' | 'amber' | 'red' {
  if (!lastPingAt) return 'red'

  const diffMs = Date.now() - new Date(lastPingAt).getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 30) return 'green'
  if (diffSeconds < 90) return 'amber'
  return 'red'
}
