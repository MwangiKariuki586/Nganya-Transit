import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import { followNganya, unfollowNganya } from "@/lib/queries/follows";
import { toAppError } from "@/shared/errors/app-error";
import type { PlannerRideOption } from "@/modules/fan/services/planner-assist";
import {
  addFollowedId,
  toggleFollowedIdSet,
} from "@/modules/fan/services/follow-optimistic";

export function useHomeFollowActions(
  initialFollowedIds: Set<string>,
  isAuthenticated: boolean,
) {
  const router = useRouter();
  const { showErrorToast, addToast } = useToast();
  const [localFollowedIds, setLocalFollowedIds] = useState<Set<string>>(
    () => new Set(initialFollowedIds),
  );
  const [plannerAlertIds, setPlannerAlertIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setLocalFollowedIds(new Set(initialFollowedIds));
  }, [initialFollowedIds]);

  const isFollowingNganya = useCallback(
    (nganyaId: string) => localFollowedIds.has(nganyaId),
    [localFollowedIds],
  );

  const toggleFollow = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        addToast("Sign in to follow nganyas.", "info");
        router.navigate({ to: "/signin", search: { returnTo: "/" } });
        return;
      }

      const wasFollowing = localFollowedIds.has(id);
      setLocalFollowedIds((current) =>
        toggleFollowedIdSet(current, id, wasFollowing),
      );

      try {
        if (wasFollowing) {
          await unfollowNganya(id);
        } else {
          await followNganya(id);
        }
      } catch {
        setLocalFollowedIds((current) =>
          toggleFollowedIdSet(current, id, !wasFollowing),
        );
        showErrorToast("Failed to update follow.");
      }
    },
    [addToast, isAuthenticated, localFollowedIds, router, showErrorToast],
  );

  const turnOnPlannerAlerts = useCallback(
    async (ride: PlannerRideOption) => {
      if (!isAuthenticated) {
        addToast("Sign in to keep ride alerts on.", "info");
        router.navigate({ to: "/signin", search: { returnTo: "/" } });
        return;
      }

      try {
        await followNganya(ride.nganya_id);
        setPlannerAlertIds((current) => new Set(current).add(ride.nganya_id));
        setLocalFollowedIds((current) => addFollowedId(current, ride.nganya_id));
        addToast(`Alerts on for ${ride.nganya_name}.`, "success");
      } catch (error) {
        const appError = toAppError(error);
        if (appError.code === "AUTH_REQUIRED") {
          addToast("Sign in to keep ride alerts on.", "info");
          router.navigate({ to: "/signin" });
          return;
        }
        showErrorToast("Failed to turn on ride alerts.");
      }
    },
    [addToast, isAuthenticated, router, showErrorToast],
  );

  const handlePlannerAlertAction = useCallback(
    (ride: PlannerRideOption) => {
      if (isFollowingNganya(ride.nganya_id) || plannerAlertIds.has(ride.nganya_id)) {
        addToast(`Alerts already on for ${ride.nganya_name}.`, "info");
        return;
      }
      void turnOnPlannerAlerts(ride);
    },
    [addToast, isFollowingNganya, plannerAlertIds, turnOnPlannerAlerts],
  );

  return {
    plannerAlertIds,
    localFollowedIds,
    isFollowingNganya,
    toggleFollow,
    turnOnPlannerAlerts,
    handlePlannerAlertAction,
  };
}
