import { ClipboardList, LayoutGrid, RadioTower, UserCog, Users } from 'lucide-react'

export const adminNavItems = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/crew', label: 'Crew', icon: UserCog },
  {
    to: '/admin/registrations',
    label: 'Registrations',
    icon: ClipboardList,
  },
  {
    to: '/admin/live',
    label: 'Live Sessions',
    icon: RadioTower,
  },
] as const

export function getAdminNavLabel(path: string) {
  return adminNavItems.find((item) => path === item.to)?.label ?? 'Admin'
}
