import { createFileRoute } from "@tanstack/react-router";
import FollowingScreen, {
  FollowingScreenSkeleton,
} from "@/modules/fan/screens/FollowingScreen";
import { loadFollowingRouteData } from "@/modules/fan/services/route-data";

export const Route = createFileRoute("/(fan)/following")({
  loader: loadFollowingRouteData,
  component: FollowingRouteComponent,
  pendingComponent: FollowingRoutePendingComponent,
});

function FollowingRouteComponent() {
  return <FollowingScreen data={Route.useLoaderData()} />;
}

function FollowingRoutePendingComponent() {
  return <FollowingScreenSkeleton />;
}
