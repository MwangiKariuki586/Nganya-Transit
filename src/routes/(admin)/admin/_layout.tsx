import { Outlet, createFileRoute } from '@tanstack/react-router'
import { requireAdminRouteAccess } from '@/modules/admin/services/route-access'

export const Route = createFileRoute('/(admin)/admin/_layout')({
  beforeLoad: async () => {
    await requireAdminRouteAccess()
  },
  component: AdminLayout,
})

function AdminLayout() {
  return <Outlet />
}
