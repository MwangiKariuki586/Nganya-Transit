import type { AppRole } from '@/shared/types/rbac'

export const rbacPolicies = {
  fan: ['fan', 'crew', 'admin'],
  crew: ['crew', 'admin'],
  admin: ['admin'],
} satisfies Record<AppRole, AppRole[]>
