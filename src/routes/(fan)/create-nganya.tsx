import { createFileRoute } from '@tanstack/react-router'
import CreateNganyaScreen from '@/modules/fan/screens/CreateNganyaScreen'
import { requireFanRouteAccess } from '@/modules/fan/services/route-access'

export const Route = createFileRoute('/(fan)/create-nganya')({
  beforeLoad: async () => {
    await requireFanRouteAccess()
  },
  component: CreateNganyaScreen,
})
