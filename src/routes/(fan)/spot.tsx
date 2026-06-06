import { createFileRoute } from '@tanstack/react-router'
import SpotScreen, { SpotScreenSkeleton } from '@/modules/fan/screens/SpotScreen'
import { loadSpotRouteData } from '@/modules/fan/services/route-data'
import { requireAuthenticatedFanRouteAccess } from '@/modules/fan/services/route-access'
import type { FanSharedData } from '@/modules/fan/services/route-data'

export const Route = createFileRoute('/(fan)/spot')({
  loader: async ({ context }) => {
    await requireAuthenticatedFanRouteAccess('/spot')
    const shared = (context as { fanShared: FanSharedData }).fanShared
    return loadSpotRouteData(shared)
  },
  component: SpotRouteComponent,
  pendingComponent: SpotRoutePendingComponent,
})

function SpotRouteComponent() {
  return <SpotScreen data={Route.useLoaderData()} />
}

function SpotRoutePendingComponent() {
  return <SpotScreenSkeleton />
}
