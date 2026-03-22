import { createFileRoute } from '@tanstack/react-router'
import { CrewShellSkeleton } from '@/modules/crew/components/CrewShellSkeleton'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import CrewRegistrationScreen from '@/modules/crew/screens/CrewRegistrationScreen'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    corridorId: typeof search.corridorId === 'string' ? search.corridorId : undefined,
    reason: typeof search.reason === 'string' ? search.reason : undefined,
    mode: typeof search.mode === 'string' ? search.mode : undefined,
  }),
  loader: async () => {
    return requireCrewRouteAccess('/crew/register')
  },
  pendingComponent: CrewShellSkeleton,
  component: CrewRegisterRoute,
})

function CrewRegisterRoute() {
  const search = Route.useSearch()
  const snapshot = Route.useLoaderData()

  return (
    <CrewRouteFrame initialSnapshot={snapshot}>
      <CrewRegistrationScreen
        initialCorridorId={search.corridorId ?? null}
        entryReason={search.reason ?? null}
        mode={search.mode ?? null}
      />
    </CrewRouteFrame>
  )
}
