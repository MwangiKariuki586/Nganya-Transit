import { createFileRoute, redirect } from "@tanstack/react-router";
import ProfileScreen from "@/modules/fan/screens/ProfileScreen";
import { loadProfileRouteData } from "@/modules/fan/services/route-data";

export const Route = createFileRoute("/(fan)/profile")({
  beforeLoad: async () => {
    // This will be called before the loader
    // If we need to check auth, we can do it here
  },
  loader: async () => {
    const data = await loadProfileRouteData();

    // If no auth user after stable session check, redirect to signin
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
  component: ProfileRouteComponent,
});

function ProfileRouteComponent() {
  return <ProfileScreen data={Route.useLoaderData()} />;
}
