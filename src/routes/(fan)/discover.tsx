import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import DiscoverScreen from "@/modules/fan/screens/DiscoverScreen";
import { loadDiscoverRouteData } from "@/modules/fan/services/route-data";
import type { FanSharedData } from "@/modules/fan/services/route-data";
import { DiscoverSkeleton } from "@/components/ui/loading";

const discoverSearchSchema = z.object({
  corridorId: z.string().optional(),
});

export const Route = createFileRoute("/(fan)/discover")({
  validateSearch: discoverSearchSchema,
  loader: async ({ context }) => {
    const shared = (context as { fanShared: FanSharedData }).fanShared;
    return loadDiscoverRouteData(shared);
  },
  pendingComponent: DiscoverSkeleton,
  component: DiscoverRouteComponent,
});

function DiscoverRouteComponent() {
  const data = Route.useLoaderData();
  const { corridorId } = Route.useSearch();
  return <DiscoverScreen data={data} initialCorridorId={corridorId ?? null} />;
}
