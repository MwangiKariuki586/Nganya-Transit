import Skeleton from "../Skeleton";
import { CardSkeleton } from "../Skeleton";

export function DiscoverSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Search bar */}
      <Skeleton variant="rectangular" className="h-12 w-full rounded-full" />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-hidden">
        <Skeleton variant="text" className="h-8 w-20 rounded-full" />
        <Skeleton variant="text" className="h-8 w-24 rounded-full" />
        <Skeleton variant="text" className="h-8 w-16 rounded-full" />
        <Skeleton variant="text" className="h-8 w-28 rounded-full" />
      </div>

      {/* Card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
