import { Outlet, createFileRoute } from '@tanstack/react-router'
import { FanRouteFrame } from '@/modules/fan/components/FanRouteFrame'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'
import { RouteErrorFallback } from '@/components/error/RouteErrorFallback'

export const Route = createFileRoute('/(fan)')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: FanLayout,
  errorComponent: ({ error, reset }) => (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Fan view failed to load"
      homeTarget="/discover"
      routeId="(fan)"
    />
  ),
})

function FanLayout() {
  return (
    <FanRouteFrame>
      <Outlet />
    </FanRouteFrame>
  )
}
