import { createFileRoute } from '@tanstack/react-router'
import AdminCrewScreen from '@/modules/admin/screens/AdminCrewScreen'

export const Route = createFileRoute('/(admin)/admin/crew')({
  component: AdminCrewRoute,
})

function AdminCrewRoute() {
  return <AdminCrewScreen />
}
