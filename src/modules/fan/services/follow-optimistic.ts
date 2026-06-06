export interface FollowOverrideState {
  isFollowing?: boolean;
  notifyLive?: boolean;
}

export type FollowOverrideMap = Record<string, FollowOverrideState>;

export function toggleFollowedIdSet(
  current: Set<string>,
  id: string,
  wasFollowing: boolean,
) {
  const next = new Set(current);
  if (wasFollowing) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function addFollowedId(current: Set<string>, id: string) {
  return new Set(current).add(id);
}

export function applyFollowOverride(
  current: FollowOverrideMap,
  id: string,
  patch: FollowOverrideState,
) {
  return {
    ...current,
    [id]: {
      ...current[id],
      ...patch,
    },
  };
}

export function restoreFollowOverride(
  current: FollowOverrideMap,
  id: string,
  previous?: FollowOverrideState,
) {
  const next = { ...current };
  if (previous) {
    next[id] = previous;
  } else {
    delete next[id];
  }
  return next;
}

export function clearMutatingId(
  current: Record<string, boolean>,
  id: string,
) {
  const next = { ...current };
  delete next[id];
  return next;
}
