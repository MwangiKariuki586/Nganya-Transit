import { createFileRoute } from '@tanstack/react-router'
import AdminRegistrationQueueScreen from '@/modules/admin/screens/AdminRegistrationQueueScreen'

export const Route = createFileRoute('/(admin)/admin/registrations')({
  component: AdminRegistrationsRoute,
})

function AdminRegistrationsRoute() {
  return <AdminRegistrationQueueScreen />
}
