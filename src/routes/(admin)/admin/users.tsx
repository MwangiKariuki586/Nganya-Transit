import { createFileRoute } from '@tanstack/react-router'
import { AdminRouteFrame } from '@/modules/admin/components/AdminRouteFrame'
import AdminUsersScreen from '@/modules/admin/screens/AdminUsersScreen'
import { requireAdminRouteAccess } from '@/modules/admin/services/route-access'

export const Route = createFileRoute('/(admin)/admin/users')({
  beforeLoad: async () => {
    await requireAdminRouteAccess()
  },
  component: AdminUsersRoute,
})

function AdminUsersRoute() {
  return (
    <AdminRouteFrame>
      <AdminUsersScreen />
    </AdminRouteFrame>
  )
}
