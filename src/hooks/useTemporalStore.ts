import { useStore } from "zustand";
import { usePlanStore } from "@/stores/plan-store";
import type { TemporalState } from "zundo";

type PlanTemporalState = TemporalState<
  Pick<
    ReturnType<typeof usePlanStore.getState>,
    "planId" | "placements" | "stagingOrder" | "quarterOrder"
  >
>;

export function useTemporalStore<T>(selector: (state: PlanTemporalState) => T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useStore(usePlanStore.temporal, selector as any) as T;
}
