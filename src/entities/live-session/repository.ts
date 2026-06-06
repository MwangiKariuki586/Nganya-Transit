import { getLiveNow, subscribeToLive } from '@/lib/queries/live'
import {
  getActiveCrewSessionServerFn,
  getCrewSessionServerFn,
  ingestCrewLocationServerFn,
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
  ingestCrewLocation: ingestCrewLocationServerFn,
  listCrewHistory: listCrewSessionHistoryServerFn,
  startCrewSession: startCrewSessionServerFn,
  pingCrewSession: pingCrewSessionServerFn,
  stopCrewSession: stopCrewSessionServerFn,
}

