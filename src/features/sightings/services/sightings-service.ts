import { sightingRepository } from '@/entities/sighting/repository'

export const sightingsService = {
  listByCorridor: sightingRepository.listByCorridor,
  create: sightingRepository.create,
  vote: sightingRepository.vote,
  subscribe: sightingRepository.subscribe,
}
