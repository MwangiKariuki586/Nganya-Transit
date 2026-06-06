import { createFileRoute } from '@tanstack/react-router'
import CrewRegistrationScreen from '@/modules/crew/screens/CrewRegistrationScreen'

export const Route = createFileRoute('/(crew)/crew/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    corridorId: typeof search.corridorId === 'string' ? search.corridorId : undefined,
    reason: typeof search.reason === 'string' ? search.reason : undefined,
    mode: typeof search.mode === 'string' ? search.mode : undefined,
  }),
  component: CrewRegisterRoute,
})

function CrewRegisterRoute() {
  const search = Route.useSearch()

  return (
    <CrewRegistrationScreen
      initialCorridorId={search.corridorId ?? null}
      entryReason={search.reason ?? null}
      mode={search.mode ?? null}
    />
  )
}
