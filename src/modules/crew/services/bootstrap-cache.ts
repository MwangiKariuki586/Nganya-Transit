import type { CrewBootstrapSnapshot } from '@/shared/types/crew-bootstrap'

const CREW_BOOTSTRAP_TTL_MS = 45_000
const STORAGE_PREFIX = 'matwana:crew-bootstrap'

interface CachedBootstrapRecord {
  snapshot: CrewBootstrapSnapshot
  cachedAt: number
}

const memoryCache = new Map<string, CachedBootstrapRecord>()

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`
}

function isFresh(record: CachedBootstrapRecord | null | undefined) {
  if (!record) return false
  return Date.now() - record.cachedAt <= CREW_BOOTSTRAP_TTL_MS
}

function readStorageRecord(userId: string): CachedBootstrapRecord | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as CachedBootstrapRecord
  } catch {
    return null
  }
}

export function readCrewBootstrapCache(userId: string): CrewBootstrapSnapshot | null {
  const memoryRecord = memoryCache.get(userId)
  if (isFresh(memoryRecord)) {
    return memoryRecord!.snapshot
  }

  const storageRecord = readStorageRecord(userId)
  if (isFresh(storageRecord)) {
    memoryCache.set(userId, storageRecord!)
    return storageRecord!.snapshot
  }

  return null
}

export function writeCrewBootstrapCache(snapshot: CrewBootstrapSnapshot) {
  if (!snapshot.userId) return

  const record: CachedBootstrapRecord = {
    snapshot,
    cachedAt: Date.now(),
  }

  memoryCache.set(snapshot.userId, record)

  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getStorageKey(snapshot.userId), JSON.stringify(record))
  } catch {
    // Ignore storage quota and privacy mode failures.
  }
}

export function clearCrewBootstrapCache(userId?: string | null) {
  if (!userId) {
    memoryCache.clear()
    if (typeof window === 'undefined') return

    try {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => window.localStorage.removeItem(key))
    } catch {
      // Ignore storage access failures.
    }
    return
  }

  memoryCache.delete(userId)

  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(getStorageKey(userId))
  } catch {
    // Ignore storage access failures.
  }
}
