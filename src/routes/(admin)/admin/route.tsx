import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AdminRouteFrame } from '@/modules/admin/components/AdminRouteFrame'
import { requireAdminRouteAccess } from '@/modules/admin/services/route-access'

export const Route = createFileRoute('/(admin)/admin')({
  beforeLoad: async () => {
    await requireAdminRouteAccess()
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <AdminRouteFrame>
      <Outlet />
    </AdminRouteFrame>
  )
}
