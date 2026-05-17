import { createFileRoute, useNavigate } from '@tanstack/react-router'
import HomeScreen, { HomeScreenSkeleton } from '@/modules/fan/screens/HomeScreen'
import { loadFanHomeRouteData } from '@/modules/fan/services/route-data'
import type { FanSharedData } from '@/modules/fan/services/route-data'

export const Route = createFileRoute('/(fan)/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    corridor: typeof search.corridor === 'string' ? search.corridor : undefined,
    vibe: typeof search.vibe === 'string' ? search.vibe : undefined,
    recent: search.recent === 'all' ? 'all' : undefined,
  }),
  loaderDeps: ({ search }) => ({
    q: search.q ?? '',
    corridor: search.corridor ?? null,
    vibe: search.vibe ?? null,
  }),
  loader: async ({ deps, context }) => {
    const shared = (context as { fanShared: FanSharedData }).fanShared
    return loadFanHomeRouteData(
      { search: deps.q, corridorId: deps.corridor, vibe: deps.vibe },
      shared,
    )
  },
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
