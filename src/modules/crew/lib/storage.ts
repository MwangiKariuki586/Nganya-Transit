export const CREW_ACTIVE_SESSION_STORAGE_KEY = 'matwana.crew.activeSessionId'
export const CREW_SETUP_DRAFT_STORAGE_KEY = 'matwana.crew.setupDraft'

export interface CrewSetupDraft {
  direction: 'TO_TOWN' | 'FROM_TOWN' | null
  seatsLeft: number
  seatsConfirmed?: boolean
}

export function readCrewActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CREW_ACTIVE_SESSION_STORAGE_KEY)
}

export function writeCrewActiveSessionId(sessionId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CREW_ACTIVE_SESSION_STORAGE_KEY, sessionId)
}

export function clearCrewActiveSessionId() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CREW_ACTIVE_SESSION_STORAGE_KEY)
}

export function readCrewSetupDraft(): CrewSetupDraft | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(CREW_SETUP_DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as CrewSetupDraft
  } catch {
    return null
  }
}

export function writeCrewSetupDraft(value: CrewSetupDraft) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CREW_SETUP_DRAFT_STORAGE_KEY, JSON.stringify(value))
}

export function clearCrewSetupDraft() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CREW_SETUP_DRAFT_STORAGE_KEY)
}

