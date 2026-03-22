import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireCrewRouteAccess, resolveCrewEntryRedirect } from '@/modules/crew/services/route-access'

export const Route = createFileRoute('/(crew)/crew/')({
  beforeLoad: async () => {
    await requireCrewRouteAccess()

    if (typeof window !== 'undefined') {
      const nextRoute = await resolveCrewEntryRedirect()
      if (nextRoute) {
        throw redirect(nextRoute)
      }
    }

    throw redirect({ to: '/crew/live' })
  },
  component: () => null,
})
