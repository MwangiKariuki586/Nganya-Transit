import { createFileRoute } from '@tanstack/react-router'
import CrewLiveSessionScreen from '@/modules/crew/screens/CrewLiveSessionScreen'

export const Route = createFileRoute('/(crew)/crew/session/$id')({
  component: CrewSessionRoute,
})

function CrewSessionRoute() {
  const { id } = Route.useParams()
  return <CrewLiveSessionScreen sessionId={id} />
}
