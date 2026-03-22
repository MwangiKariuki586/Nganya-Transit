import { createFileRoute } from '@tanstack/react-router'
import { AdminRouteFrame } from '@/modules/admin/components/AdminRouteFrame'
import AdminRegistrationQueueScreen from '@/modules/admin/screens/AdminRegistrationQueueScreen'
import { requireAdminRouteAccess } from '@/modules/admin/services/route-access'

export const Route = createFileRoute('/(admin)/admin/registrations')({
  beforeLoad: async () => {
    await requireAdminRouteAccess()
  },
  component: AdminRegistrationsRoute,
})

function AdminRegistrationsRoute() {
  return (
    <AdminRouteFrame>
      <AdminRegistrationQueueScreen />
    </AdminRouteFrame>
  )
}
