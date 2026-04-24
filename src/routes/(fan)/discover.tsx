import { createFileRoute } from '@tanstack/react-router'
import DiscoverScreen from '@/modules/fan/screens/DiscoverScreen'
import { loadDiscoverRouteData } from '@/modules/fan/services/route-data'
import type { FanSharedData } from '@/modules/fan/services/route-data'
import { DiscoverSkeleton } from '@/components/ui/loading'

export const Route = createFileRoute('/(fan)/discover')({
  loader: async ({ context }) => {
    const shared = (context as { fanShared: FanSharedData }).fanShared
    return loadDiscoverRouteData(shared)
  },
  pendingComponent: DiscoverSkeleton,
  component: DiscoverRouteComponent,
})

function DiscoverRouteComponent() {
  const data = Route.useLoaderData()
  return <DiscoverScreen data={data} />
}
