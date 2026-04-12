import { createFileRoute, useNavigate } from '@tanstack/react-router'
import DiscoverScreen from '@/modules/fan/screens/DiscoverScreen'
import { loadDiscoverRouteData } from '@/modules/fan/services/route-data'

export const Route = createFileRoute('/(fan)/discover')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    corridor: typeof search.corridor === 'string' ? search.corridor : undefined,
    vibe: typeof search.vibe === 'string' ? search.vibe : undefined,
  }),
  loaderDeps: ({ search }) => ({
    q: search.q ?? '',
    corridor: search.corridor ?? null,
    vibe: search.vibe ?? null,
  }),
  loader: async ({ deps }) =>
    loadDiscoverRouteData({
      search: deps.q,
      corridorId: deps.corridor,
      vibe: deps.vibe,
    }),
  component: DiscoverRouteComponent,
})

function DiscoverRouteComponent() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()

  return (
    <DiscoverScreen
      data={data}
      onSearchChange={(q, corridor, vibe) =>
        navigate({
          to: '/discover',
          search: {
            q: q || undefined,
            corridor: corridor || undefined,
            vibe: vibe || undefined,
          },
          replace: true,
        })
      }
    />
  )
}
