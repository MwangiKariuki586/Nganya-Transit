import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useToast } from "@/components/ui/ToastContainer";
import { followNganya, unfollowNganya } from "@/lib/queries/follows";
import { toAppError } from "@/shared/errors/app-error";
import type { PlannerRideOption } from "@/modules/fan/services/planner-assist";

export function useHomeFollowActions(initialFollowedIds: Set<string>) {
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
      const wasFollowing = localFollowedIds.has(id);
      setLocalFollowedIds((current) => {
        const next = new Set(current);
        if (wasFollowing) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });

      try {
        if (wasFollowing) {
          await unfollowNganya(id);
        } else {
          await followNganya(id);
        }
      } catch {
        setLocalFollowedIds((current) => {
          const next = new Set(current);
          if (wasFollowing) {
            next.add(id);
          } else {
            next.delete(id);
          }
          return next;
        });
        showErrorToast("Failed to update follow.");
      }
    },
    [localFollowedIds, showErrorToast],
  );

  const turnOnPlannerAlerts = useCallback(
    async (ride: PlannerRideOption) => {
      try {
        await followNganya(ride.nganya_id);
        setPlannerAlertIds((current) => new Set(current).add(ride.nganya_id));
        setLocalFollowedIds((current) => new Set(current).add(ride.nganya_id));
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
    [addToast, router, showErrorToast],
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
