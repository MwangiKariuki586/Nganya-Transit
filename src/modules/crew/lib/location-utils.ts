import type { Coords } from '../hooks/useGeolocation'

export interface Point {
  lat: number
  lng: number
}

/**
 * Convert coordinates to PostGIS POINT format
 */
export function getLocationPoint(coords: Coords | Point): string {
  return `POINT(${coords.lng} ${coords.lat})`
}

/**
 * Parse various location formats to Point
 */
export function parsePoint(location: unknown): Point | null {
  if (!location) return null

  // Handle WKT POINT format
  if (typeof location === 'string') {
    const pointMatch = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i)
    if (pointMatch) {
      return { lng: Number(pointMatch[1]), lat: Number(pointMatch[2]) }
    }

    // Handle JSON string
    try {
      const parsed = JSON.parse(location)
      if (
        parsed?.type === 'Point' &&
        Array.isArray(parsed.coordinates) &&
        parsed.coordinates.length >= 2
      ) {
        return {
          lng: Number(parsed.coordinates[0]),
          lat: Number(parsed.coordinates[1]),
        }
      }
    } catch {
      return null
    }
  }

  // Handle GeoJSON Point object
  if (typeof location === 'object' && location !== null) {
    const geo = location as any
    if (
      geo?.type === 'Point' &&
      Array.isArray(geo.coordinates) &&
      geo.coordinates.length >= 2
    ) {
      return {
        lng: Number(geo.coordinates[0]),
        lat: Number(geo.coordinates[1]),
      }
    }

    // Handle plain object with lat/lng
    if (typeof geo.lat === 'number' && typeof geo.lng === 'number') {
      return { lat: geo.lat, lng: geo.lng }
    }

    // Handle plain object with latitude/longitude
    if (typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
      return { lat: geo.latitude, lng: geo.longitude }
    }
  }

  return null
}

/**
 * Calculate distance between two points in kilometers using Haversine formula
 */
export function getDistanceKm(from: Point, to: Point): number {
  const toRad = (degrees: number) => degrees * (Math.PI / 180)
  const earthKm = 6371
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * earthKm * Math.asin(Math.sqrt(a))
}

/**
 * Calculate bearing/heading between two points in degrees (0-360)
 */
export function getBearing(from: Point, to: Point): number {
  const toRad = (degrees: number) => degrees * (Math.PI / 180)
  const toDeg = (radians: number) => radians * (180 / Math.PI)
  
  const dLng = toRad(to.lng - from.lng)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  
  const bearing = toDeg(Math.atan2(y, x))
  return (bearing + 360) % 360
}

/**
 * Determine GPS quality based on accuracy
 */
export function getGpsQuality(accuracy: number | null): 'excellent' | 'good' | 'fair' | 'poor' | null {
  if (accuracy == null || !Number.isFinite(accuracy)) return null
  if (accuracy <= 10) return 'excellent'
  if (accuracy <= 50) return 'good'
  if (accuracy <= 100) return 'fair'
  return 'poor'
}

/**
 * Calculate speed in km/h from two position updates
 */
export function calculateSpeed(from: Coords, to: Coords): number {
  const distanceKm = getDistanceKm(from, to)
  const timeDiffHours = (to.timestamp - from.timestamp) / (1000 * 60 * 60)
  return timeDiffHours > 0 ? distanceKm / timeDiffHours : 0
}

/**
 * Detect if vehicle is stationary based on recent positions
 */
export function isStationary(positions: Coords[], thresholdMeters: number = 50): boolean {
  if (positions.length < 2) return false
  
  const recent = positions.slice(-3) // Last 3 positions
  const distances = []
  
  for (let i = 1; i < recent.length; i++) {
    const dist = getDistanceKm(recent[i - 1], recent[i]) * 1000 // Convert to meters
    distances.push(dist)
  }
  
  const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length
  return avgDistance < thresholdMeters
}

/**
 * Detect direction change (U-turn detection)
 */
export function detectDirectionChange(positions: Coords[], thresholdDegrees: number = 135): boolean {
  if (positions.length < 3) return false
  
  const recent = positions.slice(-3)
  const bearing1 = getBearing(recent[0], recent[1])
  const bearing2 = getBearing(recent[1], recent[2])
  
  let diff = Math.abs(bearing2 - bearing1)
  if (diff > 180) diff = 360 - diff
  
  return diff > thresholdDegrees
}

/**
 * Validate GPS coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: Point, precision: number = 6): string {
  return `${coords.lat.toFixed(precision)}, ${coords.lng.toFixed(precision)}`
}
