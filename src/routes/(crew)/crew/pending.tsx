import { createFileRoute } from '@tanstack/react-router'
import { CrewShellSkeleton } from '@/modules/crew/components/CrewShellSkeleton'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewPendingScreen from '@/modules/crew/screens/CrewPendingScreen'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/pending')({
  loader: async () => {
    return requireCrewRouteAccess('/crew/pending')
  },
  pendingComponent: CrewShellSkeleton,
  component: CrewPendingRoute,
})

function CrewPendingRoute() {
  const snapshot = Route.useLoaderData()

  return (
    <CrewRouteFrame initialSnapshot={snapshot}>
      <CrewPendingScreen />
    </CrewRouteFrame>
  )
}
