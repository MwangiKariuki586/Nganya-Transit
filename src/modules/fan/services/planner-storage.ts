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
