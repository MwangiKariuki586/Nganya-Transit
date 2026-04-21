import { createFileRoute } from "@tanstack/react-router";
import { CrewProfileScreen } from "@/modules/crew/screens/CrewProfileScreen";
import {
  loadCrewProfileRouteData,
  type CrewProfileRouteData,
} from "@/modules/crew/services/profile-route";

export const Route = createFileRoute("/(crew)/crew/profile")({
  loader: async (): Promise<CrewProfileRouteData> => loadCrewProfileRouteData(),
  component: CrewProfileScreen,
});
