import { createFileRoute, redirect } from "@tanstack/react-router";
import CrewLiveSetupScreen from "@/modules/crew/screens/CrewLiveSetupScreen";
import { loadCrewBootstrapSnapshot } from "@/modules/crew/services/route-access";
import { getCrewStatusState } from "@/modules/crew/services/route-access";

export const Route = createFileRoute("/(crew)/crew/live")({
  /**
   * Always fetch a fresh bootstrap snapshot before rendering the setup screen.
   *
   * This ensures that if a session is already active — whether started in
   * another tab, resumed after a reload, or started moments ago — the crew
   * is redirected straight to the session screen instead of seeing the
   * "Start Live" setup form.
   *
   * We do NOT rely on context.crewSnapshot here because that snapshot is
   * loaded once when the crew layout mounts and can be stale by the time
   * the crew taps the Live tab from History or any other child route.
   */
  loader: async () => {
    const snapshot = await loadCrewBootstrapSnapshot();
    const state = getCrewStatusState(snapshot);

    if (state === "LIVE_ACTIVE" && snapshot.bootstrap.active_session?.id) {
      throw redirect({
        to: "/crew/session/$id",
        params: { id: snapshot.bootstrap.active_session.id },
        replace: true,
      });
    }

    // Return the fresh snapshot so CrewLiveSetupScreen can use it
    // via the bootstrap context refresh if needed.
    return { freshSnapshot: snapshot };
  },
  component: CrewLiveSetupScreen,
});
