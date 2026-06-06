export type LngLat = { lng: number; lat: number }

export interface OsrmRouteResult {
  coordinates: [number, number][] // [lng, lat]
  durationSeconds: number
  distanceMeters: number
}

const OSRM_BASE_URL = 'https://router.project-osrm.org'

export async function fetchOsrmRoute(params: {
  from: LngLat
  to: LngLat
  signal?: AbortSignal
}): Promise<OsrmRouteResult> {
  const { from, to, signal } = params

  const url = new URL(
    `${OSRM_BASE_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`,
  )
  url.searchParams.set('overview', 'full')
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('alternatives', 'false')
  url.searchParams.set('steps', 'false')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`)
  const body = (await res.json()) as any
  const route = body?.routes?.[0]
  const coords = route?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) {
    throw new Error('OSRM route missing geometry')
  }
  return {
    coordinates: coords as [number, number][],
    durationSeconds: Number(route?.duration ?? NaN),
    distanceMeters: Number(route?.distance ?? NaN),
  }
}

