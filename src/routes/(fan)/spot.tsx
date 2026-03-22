import { createFileRoute } from '@tanstack/react-router'
import SpotScreen from '@/modules/fan/screens/SpotScreen'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/spot')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: SpotScreen,
})
