import { getLiveNow, subscribeToLive } from '@/lib/queries/live'

export const liveSessionRepository = {
  listActive: getLiveNow,
  subscribe: subscribeToLive,
}
