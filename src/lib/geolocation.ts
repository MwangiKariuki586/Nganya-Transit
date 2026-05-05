/**
 * Shared geolocation utilities used by both the crew and fan location hooks.
 *
 * - `GeoCoords`          — canonical position shape used across the app
 * - `GeoPermission`      — unified permission state type
 * - `parsePosition`      — maps a raw GeolocationPosition to GeoCoords
 * - `watchPermission`    — queries the Permissions API and subscribes to changes
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeoPermission = 'prompt' | 'granted' | 'denied' | 'unsupported'

export interface GeoCoords {
  lat: number
  lng: number
  /** Accuracy radius in metres. null if the device doesn't report it. */
  accuracy: number | null
  /** Direction of travel in degrees [0–360). null if unavailable. */
  heading: number | null
  /** Speed in m/s. null if unavailable. */
  speed: number | null
  /** Unix timestamp (ms) of the position fix. */
  timestamp: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a raw `GeolocationPosition` to the app-wide `GeoCoords` shape.
 */
export function parsePosition(position: GeolocationPosition): GeoCoords {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    heading: Number.isFinite(position.coords.heading ?? NaN) ? (position.coords.heading as number) : null,
    speed: Number.isFinite(position.coords.speed ?? NaN) ? (position.coords.speed as number) : null,
    timestamp: position.timestamp,
  }
}

/**
 * Queries the Permissions API for the current geolocation state and subscribes
 * to future changes. Calls `onChange` immediately with the current state, then
 * again whenever the permission changes.
 *
 * Returns a cleanup function that removes the listener.
 *
 * Falls back gracefully when the Permissions API is unavailable.
 */
export function watchPermission(
  onChange: (status: GeoPermission) => void,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onChange('unsupported')
    return () => {}
  }

  if (!navigator.permissions?.query) {
    // Permissions API not available — leave at 'prompt', user must trigger manually
    onChange('prompt')
    return () => {}
  }

  let active = true
  let permStatus: PermissionStatus | null = null

  navigator.permissions
    .query({ name: 'geolocation' as PermissionName })
    .then((status) => {
      if (!active) return
      permStatus = status

      const map = (s: PermissionState): GeoPermission =>
        s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt'

      onChange(map(status.state))

      status.onchange = () => {
        if (active) onChange(map(status.state))
      }
    })
    .catch(() => {
      if (active) onChange('prompt')
    })

  return () => {
    active = false
    if (permStatus) permStatus.onchange = null
  }
}
