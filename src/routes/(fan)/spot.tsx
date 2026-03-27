import { createFileRoute } from '@tanstack/react-router'
import SpotScreen from '@/modules/fan/screens/SpotScreen'

export const Route = createFileRoute('/(fan)/spot')({
  component: SpotScreen,
})
