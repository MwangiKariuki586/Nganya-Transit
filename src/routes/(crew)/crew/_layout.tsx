import { Outlet, createFileRoute } from '@tanstack/react-router'
import { CrewFooter } from '@/modules/crew/components/CrewFooter'
import { CrewNav } from '@/modules/crew/components/CrewNav'
import { requireCrewRouteAccess } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/_layout')({
  beforeLoad: async () => {
    return requireCrewRouteAccess()
  },
  component: CrewLayout,
})

function CrewLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <CrewNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <CrewFooter />
    </div>
  )
}
