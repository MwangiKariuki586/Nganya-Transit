/**
 * Haptic feedback utilities for mobile devices
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    ('vibrate' in navigator || 'mozVibrate' in navigator || 'webkitVibrate' in navigator)
  )
}

/**
 * Trigger haptic feedback
 */
export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (!isHapticSupported()) return

  const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30],
  }

  const vibrationPattern = patterns[pattern]

  try {
    if (navigator.vibrate) {
      navigator.vibrate(vibrationPattern)
    } else if ((navigator as any).mozVibrate) {
      ;(navigator as any).mozVibrate(vibrationPattern)
    } else if ((navigator as any).webkitVibrate) {
      ;(navigator as any).webkitVibrate(vibrationPattern)
    }
  } catch (error) {
    console.warn('Haptic feedback failed:', error)
  }
}

/**
 * Trigger haptic for seat update
 */
export function hapticSeatUpdate(seats: number): void {
  if (seats === 0) {
    triggerHaptic('warning') // Full
  } else if (seats <= 2) {
    triggerHaptic('medium') // Almost full
  } else {
    triggerHaptic('light') // Normal update
  }
}

/**
 * Trigger haptic for direction change
 */
export function hapticDirectionChange(): void {
  triggerHaptic('medium')
}

/**
 * Trigger haptic for session start
 */
export function hapticSessionStart(): void {
  triggerHaptic('success')
}

/**
 * Trigger haptic for session stop
 */
export function hapticSessionStop(): void {
  triggerHaptic('heavy')
}

/**
 * Trigger haptic for error
 */
export function hapticError(): void {
  triggerHaptic('error')
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if (!isHapticSupported()) return

  try {
    if (navigator.vibrate) {
      navigator.vibrate(0)
    } else if ((navigator as any).mozVibrate) {
      ;(navigator as any).mozVibrate(0)
    } else if ((navigator as any).webkitVibrate) {
      ;(navigator as any).webkitVibrate(0)
    }
  } catch (error) {
    console.warn('Cancel haptic failed:', error)
  }
}
