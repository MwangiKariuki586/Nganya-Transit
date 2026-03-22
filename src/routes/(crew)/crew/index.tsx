import { createFileRoute, redirect } from '@tanstack/react-router'
import { resolveCrewEntryRoute } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/')({
  loader: async () => {
    const { redirectTarget } = await resolveCrewEntryRoute()
    throw redirect(redirectTarget)
  },
  component: () => null,
})
