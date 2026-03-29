/**
 * Schema validators for persisted data in Zustand stores
 * These validators ensure cached data has the correct structure before being used
 */

export function validateNganya(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    (data.corridor_id === null || typeof data.corridor_id === 'string') &&
    (data.tags === null || Array.isArray(data.tags)) &&
    typeof data.is_verified === 'boolean'
  )
}

export function validateCorridor(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.name === 'string'
  )
}

export function validateCrewBootstrapSnapshot(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.userId === 'string' &&
    typeof data.role === 'string' &&
    (data.crewMapping === null || typeof data.crewMapping === 'object') &&
    (data.assignedNganya === null || typeof data.assignedNganya === 'object')
  )
}

export function validateUserProfile(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    (data.full_name === null || typeof data.full_name === 'string') &&
    (data.handle === null || typeof data.handle === 'string')
  )
}

export function validateLiveNganya(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.nganya_id === 'string' &&
    (data.corridor_id === null || typeof data.corridor_id === 'string')
  )
}

export function validateSighting(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.nganya_id === 'string' &&
    typeof data.corridor_id === 'string' &&
    typeof data.user_id === 'string'
  )
}
