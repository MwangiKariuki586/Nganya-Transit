import { createFileRoute } from '@tanstack/react-router'
import CrewNotificationsScreen from '@/modules/crew/screens/CrewNotificationsScreen'

export const Route = createFileRoute('/(crew)/crew/notifications')({
  component: CrewNotificationsScreen,
})
