import { createFileRoute, useNavigate } from '@tanstack/react-router'
import HomeScreen, { HomeScreenSkeleton } from '@/modules/fan/screens/HomeScreen'
import { loadFanHomeRouteData } from '@/modules/fan/services/route-data'

export const Route = createFileRoute('/(fan)/')({
  validateSearch: (search: Record<string, unknown>) => ({
    corridor: typeof search.corridor === 'string' ? search.corridor : undefined,
    recent: search.recent === 'all' ? 'all' : undefined,
  }),
  loaderDeps: ({ search }) => ({ corridor: search.corridor ?? null }),
  loader: async ({ deps }) => loadFanHomeRouteData({ corridorId: deps.corridor }),
  component: FanHomeRoute,
  pendingComponent: FanHomePendingRoute,
})

function FanHomeRoute() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <HomeScreen
      data={data}
      onCorridorChange={(corridorId) =>
        navigate({
          to: '/',
          search: (current) => ({
            ...current,
            corridor: corridorId || undefined,
          }),
          replace: true,
        })
      }
      activeCorridor={search.corridor ?? null}
      showAllRecent={search.recent === 'all'}
    />
  )
}

function FanHomePendingRoute() {
  return <HomeScreenSkeleton />
}
