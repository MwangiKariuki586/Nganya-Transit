/**
 * TrackingBottomSheet — Snap-point bottom sheet for the map-first tracking overlay.
 *
 * Three snap states:
 *   collapsed  → peek bar — nganya name + ETA + catchability chip
 *   half       → key tracking panel (ETA, signal, movement hint)
 *   expanded   → full content (alternatives, actions, stage context)
 *
 * Drag handle supports swipe-to-snap on touch and pointer devices.
 * Respects prefers-reduced-motion (no transition when set).
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'
import type { SheetSnapState } from '@/lib/types/tracking'

// Height offsets from bottom of viewport (approximate, px)
const SNAP_HEIGHTS: Record<SheetSnapState, string> = {
  collapsed: '80px',
  half: '52vh',
  expanded: '88vh',
}

interface TrackingBottomSheetProps {
  snap: SheetSnapState
  onSnapChange: (next: SheetSnapState) => void
  onClose: () => void
  /** Always-visible compact summary (rendered in collapsed peek bar) */
  peekContent: ReactNode
  /** Main tracking details (rendered in half + expanded) */
  mainContent: ReactNode
  /** Alternatives / Plan B (rendered only in expanded) */
  expandedContent?: ReactNode
}

const SNAP_ORDER: SheetSnapState[] = ['collapsed', 'half', 'expanded']

function nextSnap(current: SheetSnapState): SheetSnapState {
  const idx = SNAP_ORDER.indexOf(current)
  return SNAP_ORDER[Math.min(idx + 1, SNAP_ORDER.length - 1)]
}

function prevSnap(current: SheetSnapState): SheetSnapState {
  const idx = SNAP_ORDER.indexOf(current)
  return SNAP_ORDER[Math.max(idx - 1, 0)]
}

export default function TrackingBottomSheet({
  snap,
  onSnapChange,
  onClose,
  peekContent,
  mainContent,
  expandedContent,
}: TrackingBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartYRef = useRef<number | null>(null)
  const dragCurrentYRef = useRef<number>(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  // ── Drag-to-snap via Pointer Events (works on touch + mouse) ──────────────
  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = e.clientY
    dragCurrentYRef.current = e.clientY
    setIsDragging(true)
    setDragOffsetPx(0)
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragStartYRef.current === null) return
      const delta = e.clientY - dragStartYRef.current
      dragCurrentYRef.current = e.clientY
      setDragOffsetPx(delta)
    },
    [],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragStartYRef.current === null) return
      const delta = e.clientY - dragStartYRef.current
      dragStartYRef.current = null
      setIsDragging(false)
      setDragOffsetPx(0)

      const THRESHOLD = 60
      if (delta < -THRESHOLD) {
        onSnapChange(nextSnap(snap))
      } else if (delta > THRESHOLD) {
        if (snap === 'collapsed') {
          onClose()
        } else {
          onSnapChange(prevSnap(snap))
        }
      }
    },
    [snap, onSnapChange, onClose],
  )

  // ── Keyboard accessibility ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const sheetHeight = SNAP_HEIGHTS[snap]
  const translateY = isDragging
    ? `calc(${Math.max(0, dragOffsetPx)}px)`
    : '0px'

  const transitionStyle =
    prefersReducedMotion || isDragging
      ? undefined
      : { transition: 'height 320ms cubic-bezier(0.32, 0.72, 0, 1), transform 320ms cubic-bezier(0.32, 0.72, 0, 1)' }

  return (
    <div
      ref={sheetRef}
      className="absolute bottom-0 left-0 right-0 z-20 flex flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-bg-surface)] border-t border-[var(--glass-border)] shadow-[0_-8px_40px_rgba(0,0,0,0.6)] overflow-hidden"
      style={{
        height: sheetHeight,
        transform: `translateY(${translateY})`,
        ...transitionStyle,
      }}
      role="dialog"
      aria-label="Tracking panel"
    >
      {/* Drag handle — full-width touch target */}
      <div
        className="flex-none flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Drag to resize"
      >
        <div className="w-10 h-1 rounded-full bg-[var(--color-line-strong)]" />
      </div>

      {/* Collapse / close controls */}
      <div className="flex-none flex items-center justify-between px-4 pb-2">
        <button
          onClick={() =>
            snap === 'collapsed' ? onClose() : onSnapChange(prevSnap(snap))
          }
          className="p-1.5 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
          aria-label={snap === 'collapsed' ? 'Close tracking' : 'Collapse'}
        >
          {snap === 'collapsed' ? (
            <X className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {snap !== 'expanded' && (
          <button
            onClick={() => onSnapChange(nextSnap(snap))}
            className="p-1.5 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
            aria-label="Expand tracking panel"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Peek bar — always visible */}
      <div className="flex-none px-4 pb-3">{peekContent}</div>

      {/* Scrollable main content — visible in half + expanded */}
      {snap !== 'collapsed' && (
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4">
          {mainContent}

          {/* Expanded-only content */}
          {snap === 'expanded' && expandedContent && (
            <div className="pt-2 border-t border-[var(--glass-border)]">
              {expandedContent}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
