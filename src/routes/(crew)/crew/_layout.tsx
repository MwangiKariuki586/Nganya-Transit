import { Outlet, createFileRoute } from '@tanstack/react-router'
import { enforceClientRole } from '@/shared/auth/guards'

export const Route = createFileRoute('/(crew)/crew/_layout')({
  beforeLoad: async () => {
    await enforceClientRole(['crew', 'admin'])
  },
  component: CrewLayout,
})

function CrewLayout() {
  return <Outlet />
}
