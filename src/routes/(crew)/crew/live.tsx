import { createFileRoute } from '@tanstack/react-router'
import { CrewShellSkeleton } from '@/modules/crew/components/CrewShellSkeleton'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewLiveSetupScreen from '@/modules/crew/screens/CrewLiveSetupScreen'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/live')({
  loader: async () => {
    return requireCrewRouteAccess('/crew/live')
  },
  pendingComponent: CrewShellSkeleton,
  component: CrewLiveRoute,
})

function CrewLiveRoute() {
  const snapshot = Route.useLoaderData()

  return (
    <CrewRouteFrame initialSnapshot={snapshot}>
      <CrewLiveSetupScreen />
    </CrewRouteFrame>
  )
}
