import { useRef } from 'react'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'

interface VirtualListProps<T> {
  items: T[]
  estimateSize: number
  overscan?: number
  className?: string
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode
  getItemKey?: (item: T, index: number) => string | number
}

export default function VirtualList<T>({
  items,
  estimateSize,
  overscan = 5,
  className = '',
  renderItem,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  })

  return (
    <div ref={parentRef} className={`overflow-auto ${className}`}>
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            className="absolute left-0 top-0 w-full"
            style={{
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index, virtualItem)}
          </div>
        ))}
      </div>
    </div>
  )
}
