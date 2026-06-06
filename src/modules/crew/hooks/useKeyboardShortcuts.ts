import { useEffect } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  callback: () => void
  description: string
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatches = shortcut.alt ? event.altKey : !event.altKey

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault()
          shortcut.callback()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, enabled])
}

/**
 * Common shortcuts for crew live session
 */
export function getCrewLiveShortcuts(actions: {
  incrementSeats?: () => void
  decrementSeats?: () => void
  setFull?: () => void
  toggleDirection?: () => void
  stopSession?: () => void
}): KeyboardShortcut[] {
  return [
    {
      key: 'ArrowUp',
      callback: actions.incrementSeats || (() => {}),
      description: 'Increase seats by 1',
    },
    {
      key: 'ArrowDown',
      callback: actions.decrementSeats || (() => {}),
      description: 'Decrease seats by 1',
    },
    {
      key: '0',
      callback: actions.setFull || (() => {}),
      description: 'Set to full (0 seats)',
    },
    {
      key: 'd',
      callback: actions.toggleDirection || (() => {}),
      description: 'Toggle direction',
    },
    {
      key: 's',
      ctrl: true,
      callback: actions.stopSession || (() => {}),
      description: 'Stop session',
    },
  ]
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.ctrl) parts.push('Ctrl')
  if (shortcut.shift) parts.push('Shift')
  if (shortcut.alt) parts.push('Alt')
  parts.push(shortcut.key.toUpperCase())

  return parts.join(' + ')
}
