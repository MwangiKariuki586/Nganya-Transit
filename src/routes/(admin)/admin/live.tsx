import { createFileRoute } from "@tanstack/react-router";
import AdminLiveSessionsScreen from "@/modules/admin/screens/AdminLiveSessionsScreen";

export const Route = createFileRoute("/(admin)/admin/live")({
  component: AdminLiveRoute,
});

function AdminLiveRoute() {
  return <AdminLiveSessionsScreen />;
}
