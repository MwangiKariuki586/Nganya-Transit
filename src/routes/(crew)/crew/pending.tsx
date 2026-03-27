import { createFileRoute } from '@tanstack/react-router'
import CrewPendingScreen from '@/modules/crew/screens/CrewPendingScreen'

export const Route = createFileRoute('/(crew)/crew/pending')({
  component: CrewPendingScreen,
})
