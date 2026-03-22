import { createFileRoute } from '@tanstack/react-router'
import ProfileScreen from '@/modules/fan/screens/ProfileScreen'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/profile')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: ProfileScreen,
})
