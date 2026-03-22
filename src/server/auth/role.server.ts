import type { AppRole } from '@/shared/types/rbac'
import { normalizeRole } from '@/shared/auth/roles'
import { getServerSessionSnapshot } from './session.server'

export async function getServerRole(request?: Request | null): Promise<AppRole | null> {
  const session = await getServerSessionSnapshot(request)
  return normalizeRole(session.role)
}
