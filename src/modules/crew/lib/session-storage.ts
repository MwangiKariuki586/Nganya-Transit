/**
 * Crew session storage utilities — all backed by localStorage
 */

const STORAGE_KEYS = {
  ACTIVE_SESSION_ID: 'crew_active_session_id',
  SETUP_DRAFT: 'crew_setup_draft',
  SESSION_STATE: 'crew_session_state',
  POSITION_HISTORY: 'crew_position_history',
  QUEUED_UPDATES: 'crew_queued_updates',
} as const

export interface SetupDraft {
  direction: string | null
  seatsLeft: number
  seatsConfirmed: boolean
  timestamp: number
}

export interface SessionState {
  sessionId: string
  nganyaId: string
  corridorId: string
  direction: string
  seatsLeft: number
  startedAt: string
  lastPingAt: string | null
  status: 'LIVE' | 'OFF'
}

export interface PositionRecord {
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

export interface QueuedUpdate {
  sessionId: string
  payload: any
  timestamp: number
  retryCount: number
}

// LocalStorage helpers
function getItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to remove from localStorage:', error)
  }
}

// Active Session ID
export function getCrewActiveSessionId(): string | null {
  return getItem<string>(STORAGE_KEYS.ACTIVE_SESSION_ID)
}

export function writeCrewActiveSessionId(sessionId: string): void {
  setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId)
}

export function clearCrewActiveSessionId(): void {
  removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID)
}

// Setup Draft
export function readCrewSetupDraft(): SetupDraft | null {
  return getItem<SetupDraft>(STORAGE_KEYS.SETUP_DRAFT)
}

export function writeCrewSetupDraft(draft: Omit<SetupDraft, 'timestamp'>): void {
  setItem(STORAGE_KEYS.SETUP_DRAFT, {
    ...draft,
    timestamp: Date.now(),
  })
}

export function clearCrewSetupDraft(): void {
  removeItem(STORAGE_KEYS.SETUP_DRAFT)
}

// Session State (for recovery)
export function getSessionState(): SessionState | null {
  return getItem<SessionState>(STORAGE_KEYS.SESSION_STATE)
}

export function saveSessionState(state: SessionState): void {
  setItem(STORAGE_KEYS.SESSION_STATE, state)
}

export function clearSessionState(): void {
  removeItem(STORAGE_KEYS.SESSION_STATE)
}

// Position History (last 10 positions for movement detection)
export function getPositionHistory(): PositionRecord[] {
  return getItem<PositionRecord[]>(STORAGE_KEYS.POSITION_HISTORY) || []
}

export function addPositionToHistory(position: PositionRecord): void {
  const history = getPositionHistory()
  history.push(position)
  
  // Keep only last 10 positions
  if (history.length > 10) {
    history.shift()
  }
  
  setItem(STORAGE_KEYS.POSITION_HISTORY, history)
}

export function clearPositionHistory(): void {
  removeItem(STORAGE_KEYS.POSITION_HISTORY)
}

// Queued Updates (for offline support)
export function getQueuedUpdates(): QueuedUpdate[] {
  return getItem<QueuedUpdate[]>(STORAGE_KEYS.QUEUED_UPDATES) || []
}

export function addQueuedUpdate(update: Omit<QueuedUpdate, 'timestamp' | 'retryCount'>): void {
  const queue = getQueuedUpdates()
  queue.push({
    ...update,
    timestamp: Date.now(),
    retryCount: 0,
  })
  setItem(STORAGE_KEYS.QUEUED_UPDATES, queue)
}

export function updateQueuedUpdate(index: number, update: Partial<QueuedUpdate>): void {
  const queue = getQueuedUpdates()
  if (queue[index]) {
    queue[index] = { ...queue[index], ...update }
    setItem(STORAGE_KEYS.QUEUED_UPDATES, queue)
  }
}

export function removeQueuedUpdate(index: number): void {
  const queue = getQueuedUpdates()
  queue.splice(index, 1)
  setItem(STORAGE_KEYS.QUEUED_UPDATES, queue)
}

export function clearQueuedUpdates(): void {
  removeItem(STORAGE_KEYS.QUEUED_UPDATES)
}

// Session recovery check
export function hasRecoverableSession(): boolean {
  const sessionId = getCrewActiveSessionId()
  const sessionState = getSessionState()
  
  if (!sessionId || !sessionState) return false
  if (sessionState.status !== 'LIVE') return false
  
  // Check if session is recent (within last 8 hours)
  const startedAt = new Date(sessionState.startedAt).getTime()
  const now = Date.now()
  const eightHours = 8 * 60 * 60 * 1000
  
  return now - startedAt < eightHours
}

// Clear all crew data
export function clearAllCrewData(): void {
  clearCrewActiveSessionId()
  clearCrewSetupDraft()
  clearSessionState()
  clearPositionHistory()
  clearQueuedUpdates()
}
