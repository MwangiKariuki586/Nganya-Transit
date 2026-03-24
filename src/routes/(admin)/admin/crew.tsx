import { createFileRoute } from '@tanstack/react-router'
import { AdminRouteFrame } from '@/modules/admin/components/AdminRouteFrame'
import AdminCrewScreen from '@/modules/admin/screens/AdminCrewScreen'
import { requireAdminRouteAccess } from '@/modules/admin/services/route-access'

export const Route = createFileRoute('/(admin)/admin/crew')({
  beforeLoad: async () => {
    await requireAdminRouteAccess()
  },
  component: AdminCrewRoute,
})

function AdminCrewRoute() {
  return (
    <AdminRouteFrame>
      <AdminCrewScreen />
    </AdminRouteFrame>
  )
}
