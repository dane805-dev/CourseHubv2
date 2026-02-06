"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/stores/plan-store";
import { useProfileStore } from "@/stores/profile-store";
import { validatePlan } from "@/lib/validation/engine";
import type { ValidationResult } from "@/types/validation";

/**
 * Hook that runs the validation engine whenever the plan or profile changes.
 * Returns the current validation result.
 */
export function useValidation(): ValidationResult {
  const placements = usePlanStore((s) => s.placements);
  const quarterOrder = usePlanStore((s) => s.quarterOrder);
  const majors = useProfileStore((s) => s.majors);
  const waivers = useProfileStore((s) => s.waivers);

  const result = useMemo(() => {
    const allCourseIds = Object.keys(placements);
    const placedCourseIds = allCourseIds.filter(
      (id) => placements[id]?.location !== "staging"
    );

    return validatePlan({
      placedCourseIds,
      allCourseIds,
      quarterOrder,
      majors,
      waivers,
    });
  }, [placements, quarterOrder, majors, waivers]);

  return result;
}
