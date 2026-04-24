import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface UseVirtualTableOptions {
  count: number
  estimateSize?: number
  overscan?: number
}

/**
 * Hook for virtualizing large table bodies.
 * Returns a ref for the scroll container, the virtualizer, and
 * a wrapper style for the tbody spacer.
 *
 * Usage:
 * ```
 * const { scrollRef, virtualizer, items, totalHeight } = useVirtualTable({ count: rows.length })
 *
 * <div ref={scrollRef} style={{ maxHeight: 600, overflow: 'auto' }}>
 *   <table>
 *     <thead>...</thead>
 *     <tbody style={{ height: totalHeight, position: 'relative' }}>
 *       {items.map(vRow => (
 *         <tr key={vRow.key} style={{ position: 'absolute', top: vRow.start, width: '100%' }}>
 *           ...render rows[vRow.index]
 *         </tr>
 *       ))}
 *     </tbody>
 *   </table>
 * </div>
 * ```
 */
export function useVirtualTable({
  count,
  estimateSize = 72,
  overscan = 10,
}: UseVirtualTableOptions) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  return {
    scrollRef,
    virtualizer,
    items: virtualizer.getVirtualItems(),
    totalHeight: virtualizer.getTotalSize(),
  }
}
