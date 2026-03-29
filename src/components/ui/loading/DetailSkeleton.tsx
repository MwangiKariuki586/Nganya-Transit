import Skeleton from "../Skeleton";

export function DetailSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <Skeleton variant="text" className="h-3 w-24" />
          <Skeleton variant="text" className="mt-2 h-6 w-1/2" />
          <Skeleton variant="text" className="mt-2 h-4 w-3/4" />
        </div>
        <Skeleton variant="text" className="h-8 w-24" />
      </div>

      {/* Info cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
          <Skeleton variant="text" className="h-3 w-32" />
          <div className="mt-3 space-y-2">
            <Skeleton variant="text" className="h-4 w-full" />
            <Skeleton variant="text" className="h-4 w-5/6" />
            <Skeleton variant="text" className="h-4 w-4/6" />
          </div>
        </div>
        <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4">
          <Skeleton variant="text" className="h-3 w-32" />
          <div className="mt-3 space-y-2">
            <Skeleton variant="text" className="h-4 w-full" />
            <Skeleton variant="text" className="h-4 w-5/6" />
          </div>
        </div>
      </div>

      {/* Photos */}
      <div>
        <Skeleton variant="text" className="h-3 w-20" />
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Skeleton variant="rectangular" className="h-40" />
          <Skeleton variant="rectangular" className="h-40" />
          <Skeleton variant="rectangular" className="h-40" />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Skeleton variant="text" className="h-3 w-24" />
        <Skeleton variant="rectangular" className="mt-2 h-24" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Skeleton variant="rectangular" className="h-12 w-40" />
        <Skeleton variant="rectangular" className="h-12 w-40" />
        <Skeleton variant="rectangular" className="h-12 w-32" />
      </div>
    </div>
  );
}
