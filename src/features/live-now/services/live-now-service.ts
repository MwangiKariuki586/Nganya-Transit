import { liveSessionRepository } from '@/entities/live-session/repository'

export const liveNowService = {
  list: liveSessionRepository.listActive,
  subscribe: liveSessionRepository.subscribe,
}
