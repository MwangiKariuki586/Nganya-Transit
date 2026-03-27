import { createFileRoute } from '@tanstack/react-router'
import FollowingScreen from '@/modules/fan/screens/FollowingScreen'

export const Route = createFileRoute('/(fan)/following')({
  component: FollowingScreen,
})
