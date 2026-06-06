import type { JourneyResult } from "@/lib/types/journey";
import type { PlannerStorageContext } from "@/modules/fan/services/planner-storage";

export function deriveVisibleNganyaIds(
  plannerContext: PlannerStorageContext,
  plannerResults: JourneyResult[],
): string[] | null {
  if (!plannerContext.toPlace || !plannerContext.fromStage) return null;

  const preference = plannerContext.preference;
  if (preference === "SPECIFIC") {
    const preferredId = plannerContext.preferredNganya?.id || null;
    return preferredId ? [preferredId] : null;
  }

  if (preference === "NEWEST") {
    if (!plannerResults.length) return null;
    const ids = plannerResults
      .map((r) => r.nganya_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return ids.length ? ids : null;
  }

  return null;
}
