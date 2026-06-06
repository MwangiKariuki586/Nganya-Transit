import { createFileRoute } from "@tanstack/react-router";
import CrewLiveSessionScreenV2 from "@/modules/crew/screens/CrewLiveSessionScreenV2";

export const Route = createFileRoute("/(crew)/crew/session/$id")({
  component: CrewSessionRoute,
});

function CrewSessionRoute() {
  const { id } = Route.useParams();
  return <CrewLiveSessionScreenV2 sessionId={id} />;
}
