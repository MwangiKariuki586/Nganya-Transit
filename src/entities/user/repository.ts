import { getCurrentUserProfile, getProfile } from '@/lib/queries/profile'

export const userRepository = {
  getCurrent: getCurrentUserProfile,
  getById: getProfile,
}
