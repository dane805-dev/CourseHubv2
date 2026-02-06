import type { QuarterId } from "@/types/plan";
import type { GraduationProgress, ValidationWarning } from "@/types/validation";
import { QUARTER_IDS, SEMESTER_INFO } from "@/types/plan";
import { CU_LIMITS, QUARTER_TO_TERM } from "@/lib/data/constants";
import { getCreditUnits, resolveCourse } from "@/lib/data/course-resolver";

interface CUTrackingInput {
  quarterOrder: Record<QuarterId, string[]>;
}

interface CUTrackingOutput {
  quarterCU: Record<QuarterId, number>;
  semesterCU: Record<string, number>;
  totalCU: number;
  graduationProgress: GraduationProgress;
  warnings: ValidationWarning[];
}

/**
 * Track credit units across quarters, semesters, and total.
 * Generate overload warnings and graduation range check.
 */
export function trackCreditUnits(input: CUTrackingInput): CUTrackingOutput {
  const warnings: ValidationWarning[] = [];
  const quarterCU: Record<string, number> = {};
  const semesterCU: Record<string, number> = {};
  let totalCU = 0;

  // Calculate per-quarter CU
  for (const qId of QUARTER_IDS) {
    const courses = input.quarterOrder[qId] || [];
    const cu = courses.reduce((sum, cId) => sum + (getCreditUnits(cId) ?? 0), 0);
    quarterCU[qId] = cu;
    totalCU += cu;

    // Quarter overload warning
    if (cu > CU_LIMITS.QUARTER_OVERLOAD_THRESHOLD) {
      warnings.push({
        type: "quarter_overload",
        message: `${qId} has ${cu} CU, which exceeds the recommended ${CU_LIMITS.QUARTER_OVERLOAD_THRESHOLD} CU per quarter`,
        severity: "medium",
      });
    }
  }

  // Calculate per-semester CU
  for (const [semId, semInfo] of Object.entries(SEMESTER_INFO)) {
    const [q1, q2] = semInfo.quarters;
    const cu = (quarterCU[q1] ?? 0) + (quarterCU[q2] ?? 0);
    semesterCU[semId] = cu;

    if (cu > CU_LIMITS.SEMESTER_OVERLOAD_THRESHOLD) {
      warnings.push({
        type: "quarter_overload",
        message: `${semInfo.label} has ${cu} CU, which exceeds the recommended ${CU_LIMITS.SEMESTER_OVERLOAD_THRESHOLD} CU per semester`,
        severity: "medium",
      });
    }
  }

  // Term availability warnings
  for (const qId of QUARTER_IDS) {
    const term = QUARTER_TO_TERM[qId];
    const courses = input.quarterOrder[qId] || [];

    for (const courseId of courses) {
      const course = resolveCourse(courseId);
      if (!course || !course.termAvailability) continue;

      if (course.termAvailability !== "Both" && course.termAvailability !== term) {
        warnings.push({
          type: "term_mismatch",
          courseId,
          message: `${courseId} is only offered in ${course.termAvailability} but is placed in a ${term} quarter`,
          severity: "high",
        });
      }
    }
  }

  const graduationProgress: GraduationProgress = {
    totalCU,
    minimumCU: CU_LIMITS.GRADUATION_MIN,
    maximumCU: CU_LIMITS.GRADUATION_MAX,
    isInRange: totalCU >= CU_LIMITS.GRADUATION_MIN && totalCU <= CU_LIMITS.GRADUATION_MAX,
  };

  return {
    quarterCU: quarterCU as Record<QuarterId, number>,
    semesterCU,
    totalCU,
    graduationProgress,
    warnings,
  };
}
