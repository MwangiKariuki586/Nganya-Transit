import {
  canTrackWithPlannerContext,
  getPlannerCorridorId,
  seedPlannerStorage,
  type PlannerStorageContext,
  type PlannerStorageSeedItem,
} from "@/modules/fan/services/planner-storage";

export interface PlannerHomeSearch {
  corridor: string | undefined;
}

export interface PlannerHandoffTarget extends PlannerStorageSeedItem {
  isLive?: boolean;
}

export function shouldTrackPlannerHandoffTarget(
  plannerContext: PlannerStorageContext,
  target: Pick<PlannerHandoffTarget, "corridorId" | "isLive">,
) {
  return Boolean(target.isLive) && canTrackWithPlannerContext(plannerContext, target);
}

export function buildPlannerSeedToastMessage(
  target: Pick<PlannerStorageSeedItem, "corridorName" | "name">,
) {
  return `Route set to ${target.corridorName}. Pick your pickup stage to plan with ${target.name}.`;
}

export function buildPlannerStageToastMessage(
  target: Pick<PlannerStorageSeedItem, "corridorName" | "name" | "stageName">,
) {
  return `Planner set to ${target.stageName} on ${target.corridorName} for ${target.name}.`;
}

export function buildHomePlannerSearch(
  plannerContext: PlannerStorageContext,
  target?: Pick<PlannerStorageSeedItem, "corridorId"> | null,
): PlannerHomeSearch {
  return {
    corridor:
      target?.corridorId || getPlannerCorridorId(plannerContext) || undefined,
  };
}

export function persistPlannerHandoff(
  plannerContext: PlannerStorageContext,
  target?: PlannerStorageSeedItem | null,
  options?: { clearStageOnRouteChange?: boolean },
) {
  seedPlannerStorage(plannerContext, target, options);
  return buildHomePlannerSearch(plannerContext, target);
}
