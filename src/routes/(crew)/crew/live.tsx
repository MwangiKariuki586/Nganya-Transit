import { createFileRoute, redirect } from '@tanstack/react-router'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewLiveSetupScreen from '@/modules/crew/screens/CrewLiveSetupScreen'
import { requireCrewRouteAccess, resolveCrewEntryRedirect } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/live')({
  loader: async () => {
    await requireCrewRouteAccess()

    if (typeof window !== 'undefined') {
      const nextRoute = await resolveCrewEntryRedirect()
      if (nextRoute) {
        throw redirect(nextRoute)
      }
    }

    return null
  },
  component: CrewLiveRoute,
})

function CrewLiveRoute() {
  return (
    <CrewRouteFrame>
      <CrewLiveSetupScreen />
    </CrewRouteFrame>
  )
}
