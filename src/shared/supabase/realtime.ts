import { subscribeToLive } from '@/lib/queries/live'
import { subscribeToSightings } from '@/lib/queries/sightings'

export const realtime = {
  subscribeToLive,
  subscribeToSightings,
}
