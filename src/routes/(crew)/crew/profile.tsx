import { createFileRoute } from "@tanstack/react-router";
import { CrewProfileScreen } from "@/modules/crew/screens/CrewProfileScreen";
import {
  loadCrewProfileRouteData,
  type CrewProfileRouteData,
} from "@/modules/crew/services/profile-route";
import { ProfileSkeleton } from "@/components/ui/loading";

export const Route = createFileRoute("/(crew)/crew/profile")({
  loader: async (): Promise<CrewProfileRouteData> => loadCrewProfileRouteData(),
  pendingComponent: ProfileSkeleton,
  component: CrewProfileScreen,
});
