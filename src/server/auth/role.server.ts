import type { AppRole } from '@/shared/types/rbac'
import { normalizeRole } from '@/shared/auth/roles'
import { getServerSessionSnapshot } from './session.server'

export async function getServerRole(): Promise<AppRole | null> {
  const session = await getServerSessionSnapshot()
  return normalizeRole(session.role)
}
