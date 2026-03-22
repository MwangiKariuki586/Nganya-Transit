import { Outlet, createFileRoute } from '@tanstack/react-router'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/_layout')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: FanLayout,
})

function FanLayout() {
  return <Outlet />
}
