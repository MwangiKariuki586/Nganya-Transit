import { createFileRoute, redirect } from "@tanstack/react-router";
import ProfileScreen from "@/modules/fan/screens/ProfileScreen";
import { loadProfileRouteData } from "@/modules/fan/services/route-data";
import type { FanSharedData } from "@/modules/fan/services/route-data";
import { ProfileSkeleton } from "@/shared/route-components";

export const Route = createFileRoute("/(fan)/profile")({
  loader: async ({ context }) => {
    const shared = (context as { fanShared: FanSharedData }).fanShared;
    const data = await loadProfileRouteData(shared);

    if (!data.authUser) {
      throw redirect({
        to: "/signin",
        search: {
          redirect: "/profile",
        },
      });
    }

    return data;
  },
  pendingComponent: ProfileSkeleton,
  component: ProfileRouteComponent,
});

function ProfileRouteComponent() {
  return <ProfileScreen data={Route.useLoaderData()} />;
}
