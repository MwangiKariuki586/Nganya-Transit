import { createFileRoute } from '@tanstack/react-router'
import CrewSessionHistoryScreen from '@/modules/crew/screens/CrewSessionHistoryScreen'

export const Route = createFileRoute('/(crew)/crew/history')({
  component: CrewSessionHistoryScreen,
})
