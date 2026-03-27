import { createFileRoute } from '@tanstack/react-router'
import HomeScreen from '@/modules/fan/screens/HomeScreen'

export const Route = createFileRoute('/(fan)/')({
  component: HomeScreen,
})
