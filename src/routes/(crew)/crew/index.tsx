import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCrewStatusState } from '@/modules/crew/services/route-access'
import type { CrewBootstrapSnapshot } from '@/shared/types/crew-bootstrap'

export const Route = createFileRoute('/(crew)/crew/')({
  loader: async ({ context }) => {
    const snapshot = context.crewSnapshot as CrewBootstrapSnapshot
    const state = getCrewStatusState(snapshot)

    switch (state) {
      case 'LIVE_ACTIVE':
        throw redirect({
          to: '/crew/session/$id',
          params: { id: snapshot.bootstrap.active_session!.id },
          replace: true,
        })
      case 'ASSIGNED':
        throw redirect({
          to: '/crew/live',
          replace: true,
        })
      case 'PENDING_APPROVAL':
        throw redirect({
          to: '/crew/pending',
          replace: true,
        })
      case 'NEEDS_INFO':
        throw redirect({
          to: '/crew/register',
          search: { mode: 'needs_info' },
          replace: true,
        })
      case 'REJECTED':
        throw redirect({
          to: '/crew/register',
          search: { mode: 'rejected' },
          replace: true,
        })
      case 'UNREGISTERED':
        throw redirect({
          to: '/crew/register',
          replace: true,
        })
      case 'NOT_CREW':
        throw redirect({
          to: '/discover',
          replace: true,
        })
      case 'NOT_AUTHENTICATED':
      default:
        throw redirect({
          to: '/signin',
          search: { returnTo: '/crew' },
          replace: true,
        })
    }
  },
  component: () => null,
})
