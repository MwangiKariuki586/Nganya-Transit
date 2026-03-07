import { Outlet, createFileRoute } from '@tanstack/react-router'
import { enforceClientRole } from '@/shared/auth/guards'

export const Route = createFileRoute('/(admin)/admin/_layout')({
  beforeLoad: async () => {
    await enforceClientRole(['admin'])
  },
  component: AdminLayout,
})

function AdminLayout() {
  return <Outlet />
}
