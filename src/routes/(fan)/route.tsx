import { Outlet, createFileRoute } from '@tanstack/react-router'
import { FanRouteFrame } from '@/modules/fan/components/FanRouteFrame'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'
import { RouteErrorFallback } from '@/components/error/RouteErrorFallback'
import { loadFanSharedData } from '@/modules/fan/services/route-data'
import type { FanSharedData } from '@/modules/fan/services/route-data'

export const Route = createFileRoute('/(fan)')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
    const fanShared = await loadFanSharedData()
    return { fanShared }
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
