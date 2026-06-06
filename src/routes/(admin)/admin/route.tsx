import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AdminRouteFrame } from '@/modules/admin/components/AdminRouteFrame'
import { requireAdminRouteAccess } from '@/modules/admin/services/route-access'
import { RouteErrorFallback } from '@/shared/route-components'

export const Route = createFileRoute('/(admin)/admin')({
  beforeLoad: async () => {
    await requireAdminRouteAccess()
  },
  component: AdminLayout,
  errorComponent: ({ error, reset }) => (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Admin tools failed to load"
      homeTarget="/admin"
      routeId="(admin)/admin"
    />
  ),
})

function AdminLayout() {
  return (
    <AdminRouteFrame>
      <Outlet />
    </AdminRouteFrame>
  )
}
