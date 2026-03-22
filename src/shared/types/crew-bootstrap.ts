import type { AppRole } from '@/shared/types/rbac'
import type { NganyaRegistrationRequestStatus } from '@/shared/types/nganya-registration'

export interface CrewBootstrapAssignment {
  nganya_id: string
  nganya_name: string
  terminal_label: string
  corridor_id: string
  is_verified: boolean
  media_thumb_url: string | null
}

export interface CrewBootstrapRequest {
  id: string
  status: NganyaRegistrationRequestStatus
  updated_at: string
  review_notes: string | null
}

export interface CrewBootstrapActiveSession {
  id: string
  started_at: string
}

export interface CrewBootstrapPayload {
  role: AppRole | null
  assignment: CrewBootstrapAssignment | null
  request: CrewBootstrapRequest | null
  active_session: CrewBootstrapActiveSession | null
}

export interface CrewBootstrapSnapshot {
  userId: string | null
  fetchedAt: string
  bootstrap: CrewBootstrapPayload
}

export type CrewStatusState =
  | 'NOT_AUTHENTICATED'
  | 'NOT_CREW'
  | 'UNREGISTERED'
  | 'PENDING_APPROVAL'
  | 'NEEDS_INFO'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'LIVE_ACTIVE'
