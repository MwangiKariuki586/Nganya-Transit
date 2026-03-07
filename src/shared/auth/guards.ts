import { browserSupabase } from '@/shared/supabase/browser-client'
import { normalizeRole } from '@/shared/auth/roles'
import type { AppRole } from '@/shared/types/rbac'
import { redirect } from '@tanstack/react-router'

export async function resolveClientRole(): Promise<AppRole | null> {
  const { data: { session } } = await browserSupabase.auth.getSession()
  const roleFromMetadata = session?.user?.user_metadata?.role
  return normalizeRole(roleFromMetadata)
}

export async function hasAnyRole(roles: AppRole[]): Promise<boolean> {
  const role = await resolveClientRole()
  if (!role) return false
  return roles.includes(role)
}

export async function enforceClientRole(roles: AppRole[]) {
  const role = await resolveClientRole()
  if (!role || !roles.includes(role)) {
    throw redirect({ to: '/signin' })
  }
  return role
}
