import { createFileRoute } from '@tanstack/react-router'
import NganyaDetailScreen from '@/modules/fan/screens/NganyaDetailScreen'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/nganya/$slug')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: NganyaDetailScreen,
})
