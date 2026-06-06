import type { AppRole } from '@/shared/types/rbac'
import type { NganyaRegistrationRequestStatus } from '@/shared/types/nganya-registration'

export interface AdminOverviewStats {
  totalUsers: number
  totalFans: number
  totalCrew: number
  totalAdmins: number
  pendingRegistrations: number
  needsInfoRegistrations: number
  activeLiveSessions: number
  staleLiveSessions: number
  crewWithoutAssignment: number
  roleMismatches: number
}

export interface AdminUserRecord {
  id: string
  email: string | null
  handle: string | null
  fullName: string | null
  avatarUrl: string | null
  profileRole: AppRole | null
  userRole: AppRole | null
  authRole: AppRole | null
  createdAt: string | null
  lastSignInAt: string | null
  roleMismatch: boolean
}

export interface AdminNganyaOption {
  id: string
  name: string
  corridorId: string
  corridorName: string
  isVerified: boolean
}

export interface AdminCrewRecord {
  id: string
  email: string | null
  handle: string | null
  fullName: string | null
  profileRole: AppRole | null
  assignedNganyaId: string | null
  assignedNganyaName: string | null
  assignedCorridorName: string | null
  assignmentVerified: boolean
  latestRequestId: string | null
  latestRequestStatus: NganyaRegistrationRequestStatus | null
  latestRequestUpdatedAt: string | null
  activeSessionId: string | null
  activeSessionStartedAt: string | null
  activeSessionLastPingAt: string | null
}
