import { searchNganyas, getNganya, createNganya } from '@/lib/queries/discover'

export const nganyaRepository = {
  search: searchNganyas,
  getById: getNganya,
  create: createNganya,
}
