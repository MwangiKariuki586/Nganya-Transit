import { createFileRoute } from '@tanstack/react-router'
import ProfileScreen from '@/modules/fan/screens/ProfileScreen'
import { loadProfileRouteData } from '@/modules/fan/services/route-data'

export const Route = createFileRoute('/(fan)/profile')({
  loader: loadProfileRouteData,
  component: ProfileRouteComponent,
})

function ProfileRouteComponent() {
  return <ProfileScreen data={Route.useLoaderData()} />
}
