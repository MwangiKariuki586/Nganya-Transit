import { createFileRoute } from '@tanstack/react-router'
import HomeScreen from '@/modules/fan/screens/HomeScreen'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: HomeScreen,
})
