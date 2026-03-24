import { Outlet, createFileRoute } from '@tanstack/react-router'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/_layout')({
  beforeLoad: async () => {
    return requireCrewRouteAccess('/crew')
  },
  component: CrewLayout,
})

function CrewLayout() {
  return <Outlet />
}
