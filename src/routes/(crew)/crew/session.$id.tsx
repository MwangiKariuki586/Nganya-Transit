import { createFileRoute } from '@tanstack/react-router'
import { CrewShellSkeleton } from '@/modules/crew/components/CrewShellSkeleton'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewLiveSessionScreen from '@/modules/crew/screens/CrewLiveSessionScreen'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/session/$id')({
  loader: async () => {
    return requireCrewRouteAccess('/crew/session/$id')
  },
  pendingComponent: CrewShellSkeleton,
  component: CrewSessionRoute,
})

function CrewSessionRoute() {
  const { id } = Route.useParams()
  const snapshot = Route.useLoaderData()
  return (
    <CrewRouteFrame initialSnapshot={snapshot}>
      <CrewLiveSessionScreen sessionId={id} />
    </CrewRouteFrame>
  )
}
