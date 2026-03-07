import { analyticsEvents } from './events'

export function track(event: keyof typeof analyticsEvents, payload?: Record<string, unknown>) {
  // Keep analytics side-effects centralized and swappable.
  console.log(`Analytics: ${analyticsEvents[event]}`, payload || {})
}
