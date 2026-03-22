import { createFileRoute } from '@tanstack/react-router'
import FollowingScreen from '@/modules/fan/screens/FollowingScreen'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/following')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: FollowingScreen,
})
