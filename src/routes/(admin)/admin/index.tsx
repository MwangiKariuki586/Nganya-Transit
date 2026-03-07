import { createFileRoute } from '@tanstack/react-router'
import AdminHomeScreen from '@/modules/admin/screens/AdminHomeScreen'

export const Route = createFileRoute('/(admin)/admin/')({
  component: AdminHomeScreen,
})
