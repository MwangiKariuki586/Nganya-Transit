import { Outlet, createFileRoute } from '@tanstack/react-router'
import { enforceClientRole } from '@/shared/auth/guards'

export const Route = createFileRoute('/(fan)/_layout')({
  beforeLoad: async () => {
    await enforceClientRole(['fan', 'crew', 'admin'])
  },
  component: FanLayout,
})

function FanLayout() {
  return <Outlet />
}
