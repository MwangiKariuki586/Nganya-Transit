import { createFileRoute } from '@tanstack/react-router'
import { AdminRouteFrame } from '@/modules/admin/components/AdminRouteFrame'
import AdminHomeScreen from '@/modules/admin/screens/AdminHomeScreen'
import { requireAdminRouteAccess } from '@/modules/admin/services/route-access'

export const Route = createFileRoute('/(admin)/admin/')({
  beforeLoad: async () => {
    await requireAdminRouteAccess()
  },
  component: AdminIndexRoute,
})

function AdminIndexRoute() {
  return (
    <AdminRouteFrame>
      <AdminHomeScreen />
    </AdminRouteFrame>
  )
}
