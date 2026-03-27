import { Outlet, createFileRoute } from '@tanstack/react-router'
import { CrewShellSkeleton } from '@/modules/crew/components/CrewShellSkeleton'
import { CrewRouteFrame } from '@/modules/crew/components/CrewRouteFrame'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew')({
  beforeLoad: async ({ location }) => {
    const snapshot = await requireCrewRouteAccess(location.pathname)
    return { crewSnapshot: snapshot }
  },
  pendingComponent: CrewShellSkeleton,
  component: CrewLayout,
})

function CrewLayout() {
  const { crewSnapshot } = Route.useRouteContext()

  return (
    <CrewRouteFrame initialSnapshot={crewSnapshot}>
      <Outlet />
    </CrewRouteFrame>
  )
}
