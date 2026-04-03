import { getDistanceKm, calculateSpeed, isValidCoordinates } from './location-utils'
import type { Coords } from '../hooks/useGeolocation'

export interface SpoofingCheck {
  isSuspicious: boolean
  reasons: string[]
  severity: 'low' | 'medium' | 'high'
  confidence: number // 0-1
}

const MAX_REALISTIC_SPEED_KMH = 150 // Maximum realistic speed for matatu
const MAX_ACCELERATION_KMH_PER_SEC = 20 // Maximum realistic acceleration
const MIN_REALISTIC_ACCURACY = 5 // Suspiciously accurate (< 5m is unusual)
const MAX_REALISTIC_ACCURACY = 5000 // Suspiciously inaccurate (> 5km)
const TELEPORT_THRESHOLD_KM = 10 // Instant movement > 10km is suspicious

/**
 * Detect potential GPS spoofing based on position history
 */
export function detectSpoofing(
  currentPosition: Coords,
  previousPositions: Coords[],
): SpoofingCheck {
  const reasons: string[] = []
  let suspicionScore = 0

  // Check 1: Invalid coordinates
  if (!isValidCoordinates(currentPosition.lat, currentPosition.lng)) {
    reasons.push('Invalid GPS coordinates')
    suspicionScore += 0.5
  }

  // Check 2: Suspiciously accurate GPS
  if (
    currentPosition.accuracy !== null &&
    currentPosition.accuracy < MIN_REALISTIC_ACCURACY
  ) {
    reasons.push(`Unrealistically accurate GPS (${currentPosition.accuracy.toFixed(1)}m)`)
    suspicionScore += 0.2
  }

  // Check 3: Suspiciously inaccurate GPS
  if (
    currentPosition.accuracy !== null &&
    currentPosition.accuracy > MAX_REALISTIC_ACCURACY
  ) {
    reasons.push(`Extremely inaccurate GPS (${(currentPosition.accuracy / 1000).toFixed(1)}km)`)
    suspicionScore += 0.3
  }

  // Check 4: Impossible speed
  if (previousPositions.length > 0) {
    const prevPosition = previousPositions[previousPositions.length - 1]
    const speed = calculateSpeed(prevPosition, currentPosition)

    if (speed > MAX_REALISTIC_SPEED_KMH) {
      reasons.push(`Impossible speed (${speed.toFixed(0)} km/h)`)
      suspicionScore += 0.4
    }

    // Check 5: Teleportation (instant long-distance movement)
    const distance = getDistanceKm(prevPosition, currentPosition)
    const timeDiffSeconds = (currentPosition.timestamp - prevPosition.timestamp) / 1000

    if (distance > TELEPORT_THRESHOLD_KM && timeDiffSeconds < 10) {
      reasons.push(`Teleportation detected (${distance.toFixed(1)}km in ${timeDiffSeconds.toFixed(0)}s)`)
      suspicionScore += 0.5
    }
  }

  // Check 6: Impossible acceleration
  if (previousPositions.length >= 2) {
    const prev1 = previousPositions[previousPositions.length - 1]
    const prev2 = previousPositions[previousPositions.length - 2]

    const speed1 = calculateSpeed(prev2, prev1)
    const speed2 = calculateSpeed(prev1, currentPosition)
    const timeDiff = (currentPosition.timestamp - prev1.timestamp) / 1000

    if (timeDiff > 0) {
      const acceleration = Math.abs(speed2 - speed1) / timeDiff
      if (acceleration > MAX_ACCELERATION_KMH_PER_SEC) {
        reasons.push(`Impossible acceleration (${acceleration.toFixed(1)} km/h/s)`)
        suspicionScore += 0.3
      }
    }
  }

  // Check 7: Constant perfect accuracy (spoofing apps often report same accuracy)
  if (previousPositions.length >= 3) {
    const accuracies = [
      ...previousPositions.slice(-3).map((p) => p.accuracy),
      currentPosition.accuracy,
    ].filter((a) => a !== null) as number[]

    if (accuracies.length >= 4) {
      const allSame = accuracies.every((a) => Math.abs(a - accuracies[0]) < 0.1)
      if (allSame && accuracies[0] < 10) {
        reasons.push('Suspiciously constant GPS accuracy')
        suspicionScore += 0.3
      }
    }
  }

  // Check 8: Zero altitude variation (some spoofers don't simulate altitude)
  if (previousPositions.length >= 3) {
    const altitudes = previousPositions
      .slice(-3)
      .map((p) => (p as any).altitude)
      .filter((a) => a !== null && a !== undefined)

    if (altitudes.length >= 3) {
      const allZero = altitudes.every((a) => a === 0)
      if (allZero) {
        reasons.push('Suspicious altitude data')
        suspicionScore += 0.2
      }
    }
  }

  // Determine severity
  let severity: 'low' | 'medium' | 'high' = 'low'
  if (suspicionScore >= 0.7) {
    severity = 'high'
  } else if (suspicionScore >= 0.4) {
    severity = 'medium'
  }

  return {
    isSuspicious: suspicionScore >= 0.4,
    reasons,
    severity,
    confidence: Math.min(suspicionScore, 1),
  }
}

/**
 * Check if position is within expected corridor bounds
 */
export function isWithinCorridorBounds(
  position: Coords,
  corridorBounds: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  },
  bufferKm: number = 5,
): boolean {
  const bufferDegrees = bufferKm / 111 // Rough conversion: 1 degree ≈ 111km

  return (
    position.lat >= corridorBounds.minLat - bufferDegrees &&
    position.lat <= corridorBounds.maxLat + bufferDegrees &&
    position.lng >= corridorBounds.minLng - bufferDegrees &&
    position.lng <= corridorBounds.maxLng + bufferDegrees
  )
}

/**
 * Validate position against known stage locations
 */
export function validateAgainstStages(
  position: Coords,
  stages: Array<{ lat: number; lng: number }>,
  maxDistanceKm: number = 20,
): boolean {
  if (stages.length === 0) return true // Can't validate without stages

  const nearestDistance = Math.min(
    ...stages.map((stage) => getDistanceKm(position, stage)),
  )

  return nearestDistance <= maxDistanceKm
}

/**
 * Generate spoofing report for admin review
 */
export function generateSpoofingReport(
  sessionId: string,
  crewId: string,
  checks: SpoofingCheck[],
  positions: Coords[],
): {
  sessionId: string
  crewId: string
  timestamp: string
  totalChecks: number
  suspiciousChecks: number
  highSeverityCount: number
  allReasons: string[]
  positionSummary: {
    count: number
    avgSpeed: number
    maxSpeed: number
    totalDistance: number
  }
} {
  const suspiciousChecks = checks.filter((c) => c.isSuspicious)
  const highSeverityCount = checks.filter((c) => c.severity === 'high').length
  const allReasons = [...new Set(checks.flatMap((c) => c.reasons))]

  // Calculate position summary
  let totalDistance = 0
  const speeds: number[] = []

  for (let i = 1; i < positions.length; i++) {
    const distance = getDistanceKm(positions[i - 1], positions[i])
    totalDistance += distance

    const speed = calculateSpeed(positions[i - 1], positions[i])
    speeds.push(speed)
  }

  return {
    sessionId,
    crewId,
    timestamp: new Date().toISOString(),
    totalChecks: checks.length,
    suspiciousChecks: suspiciousChecks.length,
    highSeverityCount,
    allReasons,
    positionSummary: {
      count: positions.length,
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      totalDistance,
    },
  }
}
