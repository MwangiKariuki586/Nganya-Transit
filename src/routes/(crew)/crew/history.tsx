import { createFileRoute } from '@tanstack/react-router'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewSessionHistoryScreen from '@/modules/crew/screens/CrewSessionHistoryScreen'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/history')({
  beforeLoad: async () => {
    await requireCrewRouteAccess()
  },
  component: CrewHistoryRoute,
})

function CrewHistoryRoute() {
  return (
    <CrewRouteFrame>
      <CrewSessionHistoryScreen />
    </CrewRouteFrame>
  )
}
