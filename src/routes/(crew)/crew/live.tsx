import { createFileRoute } from '@tanstack/react-router'
import CrewLiveSetupScreen from '@/modules/crew/screens/CrewLiveSetupScreen'

export const Route = createFileRoute('/(crew)/crew/live')({
  component: CrewLiveSetupScreen,
})
