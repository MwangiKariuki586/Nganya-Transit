import { Outlet, createFileRoute } from '@tanstack/react-router'
import { FanRouteFrame } from '@/modules/fan/components/FanRouteFrame'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: FanLayout,
})

function FanLayout() {
  return (
    <FanRouteFrame>
      <Outlet />
    </FanRouteFrame>
  )
}
