import { useEffect, useMemo, useState } from "react";

import {
  readPlannerStorageContext,
  EMPTY_PLANNER_CONTEXT,
  writePlannerStorageContext,
  type PlannerStorageContext,
} from "@/modules/fan/services/planner-storage";

export function usePlannerFilters() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [plannerContext, setPlannerContext] = useState<PlannerStorageContext>(
    EMPTY_PLANNER_CONTEXT,
  );

  // Avoid SSR/client hydration mismatches by hydrating from storage after mount.
  useEffect(() => {
    setPlannerContext(readPlannerStorageContext());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    writePlannerStorageContext(plannerContext);
  }, [hasHydrated, plannerContext]);

  const api = useMemo(
    () => ({
      hasHydrated,
      plannerContext,
      setPlannerContext,
      clearPlannerContext: () => setPlannerContext(EMPTY_PLANNER_CONTEXT),
    }),
    [hasHydrated, plannerContext],
  );

  return api;
}
