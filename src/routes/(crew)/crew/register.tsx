import { createFileRoute, redirect } from '@tanstack/react-router'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewRegistrationScreen from '@/modules/crew/screens/CrewRegistrationScreen'
import { requireCrewRouteAccess, resolveCrewRegisterRouteRedirect } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    corridorId: typeof search.corridorId === 'string' ? search.corridorId : undefined,
    reason: typeof search.reason === 'string' ? search.reason : undefined,
  }),
  beforeLoad: async () => {
    await requireCrewRouteAccess()

    if (typeof window !== 'undefined') {
      const nextRoute = await resolveCrewRegisterRouteRedirect()
      if (nextRoute) {
        throw redirect(nextRoute)
      }
    }
  },
  component: CrewRegisterRoute,
})

function CrewRegisterRoute() {
  const search = Route.useSearch()

  return (
    <CrewRouteFrame>
      <CrewRegistrationScreen
        initialCorridorId={search.corridorId ?? null}
        entryReason={search.reason ?? null}
      />
    </CrewRouteFrame>
  )
}
