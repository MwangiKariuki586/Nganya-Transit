import { createFileRoute } from '@tanstack/react-router'
import ProfileScreen from '@/modules/fan/screens/ProfileScreen'

export const Route = createFileRoute('/(fan)/profile')({
  component: ProfileScreen,
})
