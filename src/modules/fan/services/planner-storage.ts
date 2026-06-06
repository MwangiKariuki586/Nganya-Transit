interface PlannerPlace {
  id: string;
  name: string;
  corridor_id?: string;
}

interface PlannerStage {
  id: string;
  name: string;
}

interface PlannerNganya {
  id: string;
  name: string;
}

export interface PlannerStorageContext {
  toPlace: PlannerPlace | null;
  fromStage: PlannerStage | null;
  preferredNganya: PlannerNganya | null;
  preference: "ANY" | "NEWEST" | "SPECIFIC";
}

export interface PlannerStorageSeedItem {
  id: string;
  name: string;
  corridorId?: string | null;
  corridorName?: string | null;
  stageId?: string | null;
  stageName?: string | null;
}

export interface PlannerTrackItem {
  corridorId?: string | null;
}

export const EMPTY_PLANNER_CONTEXT: PlannerStorageContext = {
  toPlace: null,
  fromStage: null,
  preferredNganya: null,
  preference: "ANY",
};

export function readStoredJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function readPlannerStorageContext(): PlannerStorageContext {
  return {
    toPlace: readStoredJson<PlannerPlace>("whereto_toPlace"),
    fromStage: readStoredJson<PlannerStage>("whereto_fromStage"),
    preferredNganya: readStoredJson<PlannerNganya>("whereto_preferredNganya"),
    preference:
      readStoredJson<PlannerStorageContext["preference"]>("whereto_preference") ||
      "ANY",
  };
}

export function writePlannerStorageContext(plannerContext: PlannerStorageContext) {
  if (typeof window === "undefined") return;

  if (plannerContext.toPlace) {
    window.localStorage.setItem(
      "whereto_toPlace",
      JSON.stringify(plannerContext.toPlace),
    );
  } else {
    window.localStorage.removeItem("whereto_toPlace");
  }

  if (plannerContext.fromStage) {
    window.localStorage.setItem(
      "whereto_fromStage",
      JSON.stringify(plannerContext.fromStage),
    );
  } else {
    window.localStorage.removeItem("whereto_fromStage");
  }

  window.localStorage.setItem("whereto_preference", plannerContext.preference);

  if (plannerContext.preferredNganya) {
    window.localStorage.setItem(
      "whereto_preferredNganya",
      JSON.stringify(plannerContext.preferredNganya),
    );
  } else {
    window.localStorage.removeItem("whereto_preferredNganya");
  }
}

export function getPlannerCorridorId(plannerContext: PlannerStorageContext) {
  return plannerContext.toPlace?.corridor_id || plannerContext.toPlace?.id || null;
}

export function reconcilePlannerContext(
  current: PlannerStorageContext,
  proposed: PlannerStorageContext,
): PlannerStorageContext {
  const nextCorridorId = getPlannerCorridorId(proposed);
  const currentCorridorId = getPlannerCorridorId(current);

  if (!nextCorridorId) {
    return EMPTY_PLANNER_CONTEXT;
  }

  const next: PlannerStorageContext = {
    ...proposed,
    toPlace: proposed.toPlace
      ? { ...proposed.toPlace, corridor_id: nextCorridorId }
      : null,
  };

  // Keep stage/preference consistent when the route changes.
  if (currentCorridorId && nextCorridorId !== currentCorridorId) {
    next.fromStage = null;
    next.preference = "ANY";
    next.preferredNganya = null;
  }

  // Stage can't exist without a route.
  if (!next.toPlace) next.fromStage = null;

  // Preferred nganya only makes sense for SPECIFIC.
  if (next.preference !== "SPECIFIC") next.preferredNganya = null;

  return next;
}

export function applyPlannerSeed(
  current: PlannerStorageContext,
  item: PlannerStorageSeedItem,
  options?: { clearStageOnRouteChange?: boolean },
): PlannerStorageContext {
  const currentCorridorId = getPlannerCorridorId(current);
  const nextCorridorId = item.corridorId || currentCorridorId || null;

  const shouldClearStage =
    Boolean(options?.clearStageOnRouteChange) &&
    Boolean(currentCorridorId && nextCorridorId && currentCorridorId !== nextCorridorId);

  return {
    toPlace: nextCorridorId
      ? {
          id: nextCorridorId,
          name: item.corridorName || current.toPlace?.name || "Route",
          corridor_id: nextCorridorId,
        }
      : null,
    fromStage: shouldClearStage ? null : current.fromStage,
    preference: "SPECIFIC",
    preferredNganya: { id: item.id, name: item.name },
  };
}

export function seedPlannerStorage(
  plannerContext: PlannerStorageContext,
  item?: PlannerStorageSeedItem | null,
  options?: {
    clearStageOnRouteChange?: boolean;
  },
) {
  if (typeof window === "undefined") return;

  const previousCorridorId =
    plannerContext.toPlace?.corridor_id || plannerContext.toPlace?.id || null;
  const corridorId =
    item?.corridorId ||
    plannerContext.toPlace?.corridor_id ||
    plannerContext.toPlace?.id ||
    null;
  const corridorName =
    item?.corridorName || plannerContext.toPlace?.name || "Route";

  if (corridorId) {
    window.localStorage.setItem(
      "whereto_toPlace",
      JSON.stringify({
        id: corridorId,
        name: corridorName,
        corridor_id: corridorId,
      }),
    );
  }

  if (
    options?.clearStageOnRouteChange &&
    previousCorridorId &&
    corridorId &&
    previousCorridorId !== corridorId
  ) {
    window.localStorage.removeItem("whereto_fromStage");
  }

  if (item?.stageId && item.stageName) {
    window.localStorage.setItem(
      "whereto_fromStage",
      JSON.stringify({
        id: item.stageId,
        name: item.stageName,
      }),
    );
  }

  if (item) {
    window.localStorage.setItem("whereto_preference", "SPECIFIC");
    window.localStorage.setItem(
      "whereto_preferredNganya",
      JSON.stringify({ id: item.id, name: item.name }),
    );
    return;
  }

  if (!plannerContext.preferredNganya) {
    window.localStorage.setItem("whereto_preference", "ANY");
    window.localStorage.removeItem("whereto_preferredNganya");
  }
}

export function canTrackWithPlannerContext(
  plannerContext: PlannerStorageContext,
  item: PlannerTrackItem,
) {
  return (
    Boolean(plannerContext.toPlace && plannerContext.fromStage) &&
    Boolean(item.corridorId) &&
    (plannerContext.toPlace?.corridor_id || plannerContext.toPlace?.id) ===
      item.corridorId
  );
}
