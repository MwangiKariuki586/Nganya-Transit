import { createFileRoute } from '@tanstack/react-router'
import AdminUsersScreen from '@/modules/admin/screens/AdminUsersScreen'

export const Route = createFileRoute('/(admin)/admin/users')({
  component: AdminUsersRoute,
})

function AdminUsersRoute() {
  return <AdminUsersScreen />
}
