import { followNganya, getMyFollows, unfollowNganya } from '@/lib/queries/follows'

export const followingService = {
  list: getMyFollows,
  follow: followNganya,
  unfollow: unfollowNganya,
}
