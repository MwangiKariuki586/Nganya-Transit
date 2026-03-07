import { createFileRoute } from '@tanstack/react-router'
import CrewHomeScreen from '@/modules/crew/screens/CrewHomeScreen'

export const Route = createFileRoute('/(crew)/crew/')({
  component: CrewHomeScreen,
})
