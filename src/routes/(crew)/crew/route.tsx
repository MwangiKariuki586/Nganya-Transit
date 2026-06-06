import { Outlet, createFileRoute } from '@tanstack/react-router'
import { CrewShellSkeleton } from '@/modules/crew/components/CrewShellSkeleton'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'
import { RouteErrorFallback } from '@/shared/route-components'

export const Route = createFileRoute('/(crew)/crew')({
  beforeLoad: async ({ location }) => {
    const snapshot = await requireCrewRouteAccess(location.pathname)
    return { crewSnapshot: snapshot }
  },
  pendingComponent: CrewShellSkeleton,
  component: CrewLayout,
  errorComponent: ({ error, reset }) => (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Crew tools are temporarily unavailable"
      homeTarget="/crew"
      routeId="(crew)/crew"
    />
  ),
})

function CrewLayout() {
  const { crewSnapshot } = Route.useRouteContext()

  return (
    <CrewRouteFrame initialSnapshot={crewSnapshot}>
      <Outlet />
    </CrewRouteFrame>
  )
}
