import Skeleton from "../Skeleton";

interface ListSkeletonProps {
  items?: number;
  className?: string;
}

export function ListSkeleton({ items = 5, className = "" }: ListSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Skeleton variant="text" className="h-4 w-2/3" />
              <Skeleton variant="text" className="mt-2 h-3 w-1/2" />
              <Skeleton variant="text" className="mt-2 h-3 w-1/3" />
            </div>
            <Skeleton variant="text" className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
