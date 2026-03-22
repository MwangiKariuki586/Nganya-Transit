import { createFileRoute } from '@tanstack/react-router'
import DiscoverScreen from '@/modules/fan/screens/DiscoverScreen'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/discover')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: DiscoverScreen,
})
