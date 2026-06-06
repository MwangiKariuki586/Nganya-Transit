import Skeleton from "../Skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  className = "",
}: TableSkeletonProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-3 py-2">
                <Skeleton variant="text" className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="bg-[rgba(10,10,15,0.55)]">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-3 py-4 ${colIndex === 0 ? "rounded-l-[20px]" : ""} ${colIndex === columns - 1 ? "rounded-r-[20px]" : ""}`}
                >
                  <Skeleton variant="text" className="h-4 w-full" />
                  {colIndex === 0 && (
                    <Skeleton variant="text" className="mt-2 h-3 w-3/4" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
