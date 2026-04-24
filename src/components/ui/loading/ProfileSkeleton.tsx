import Skeleton from "../Skeleton";

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Cover */}
      <Skeleton variant="rectangular" className="h-40 w-full rounded-[20px]" />

      {/* Avatar + name */}
      <div className="flex items-end gap-4 -mt-12 px-4">
        <Skeleton variant="circular" className="h-20 w-20 shrink-0 border-4 border-[var(--color-bg-base)]" />
        <div className="flex-1 space-y-2 pt-10">
          <Skeleton variant="text" className="h-5 w-40" />
          <Skeleton variant="text" className="h-3 w-28" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 px-4">
        <Skeleton variant="text" className="h-4 w-16" />
        <Skeleton variant="text" className="h-4 w-16" />
        <Skeleton variant="text" className="h-4 w-16" />
      </div>

      {/* Bio */}
      <div className="space-y-2 px-4">
        <Skeleton variant="text" className="h-3 w-full" />
        <Skeleton variant="text" className="h-3 w-5/6" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 px-4">
        <Skeleton variant="rectangular" className="h-10 w-28 rounded-full" />
        <Skeleton variant="rectangular" className="h-10 w-28 rounded-full" />
      </div>

      {/* Content cards */}
      <div className="space-y-3 px-4">
        <Skeleton variant="card" className="h-32" />
        <Skeleton variant="card" className="h-32" />
      </div>
    </div>
  );
}
