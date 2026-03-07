import { createFileRoute } from '@tanstack/react-router'
import DiscoverScreen from '@/modules/fan/screens/DiscoverScreen'

export const Route = createFileRoute('/(fan)/discover')({
  component: DiscoverScreen,
})
