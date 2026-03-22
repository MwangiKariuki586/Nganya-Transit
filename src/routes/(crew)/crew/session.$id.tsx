import { createFileRoute } from '@tanstack/react-router'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewLiveSessionScreen from '@/modules/crew/screens/CrewLiveSessionScreen'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/session/$id')({
  beforeLoad: async () => {
    await requireCrewRouteAccess()
  },
  component: CrewSessionRoute,
})

function CrewSessionRoute() {
  const { id } = Route.useParams()
  return (
    <CrewRouteFrame>
      <CrewLiveSessionScreen sessionId={id} />
    </CrewRouteFrame>
  )
}
