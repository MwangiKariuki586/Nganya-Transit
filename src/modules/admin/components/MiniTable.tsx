import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TableSkeleton } from "@/components/ui/loading";

interface MiniTableProps {
  title: string;
  columns: string[];
  rows: Array<{
    id: string;
    cells: Array<string | React.ReactNode>;
  }>;
  emptyMessage?: string;
  actionLabel?: string;
  actionTo?: string;
  isLoading?: boolean;
}

export function MiniTable({
  title,
  columns,
  rows,
  emptyMessage = "No items",
  actionLabel = "View all",
  actionTo,
  isLoading,
}: MiniTableProps) {
  return (
    <section className="rounded-[28px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)] md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 text-white">{title}</h2>
        {actionTo && rows.length > 0 && (
          <Link
            to={actionTo}
            className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] no-underline transition-colors hover:text-[var(--color-accent)]/80"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4">
          <TableSkeleton rows={3} columns={columns.length} />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] p-6 text-center">
          <div className="text-body-sm text-[var(--color-text-secondary)]">
            {emptyMessage}
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-2 text-left text-caption text-[var(--color-text-tertiary)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--glass-border)]/50 last:border-0"
                >
                  {row.cells.map((cell, idx) => (
                    <td
                      key={idx}
                      className="px-3 py-3 text-sm text-[var(--color-text-secondary)]"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
