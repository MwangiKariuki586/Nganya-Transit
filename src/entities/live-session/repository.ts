import { getLiveNow, subscribeToLive } from '@/lib/queries/live'
import {
  getActiveCrewSessionServerFn,
  getCrewSessionServerFn,
  listCrewSessionHistoryServerFn,
  pingCrewSessionServerFn,
  startCrewSessionServerFn,
  stopCrewSessionServerFn,
} from '@/shared/server-fns/crew-live'

export const liveSessionRepository = {
  listActive: getLiveNow,
  subscribe: subscribeToLive,
  getActiveCrewSession: getActiveCrewSessionServerFn,
  getCrewSessionById: getCrewSessionServerFn,
  listCrewHistory: listCrewSessionHistoryServerFn,
  startCrewSession: startCrewSessionServerFn,
  pingCrewSession: pingCrewSessionServerFn,
  stopCrewSession: stopCrewSessionServerFn,
}

