import {
  getCorridorSightings,
  postSighting,
  voteOnSighting,
  subscribeToSightings,
} from '@/lib/queries/sightings'

export const sightingRepository = {
  listByCorridor: getCorridorSightings,
  create: postSighting,
  vote: voteOnSighting,
  subscribe: subscribeToSightings,
}
