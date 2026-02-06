import type { QuarterId } from "@/types/plan";
import type { MajorCode, WaiverConfig } from "@/types/user";
import type { ValidationResult } from "@/types/validation";
import { getCoreRequirements } from "@/lib/data/requirements";
import { getMajorRequirement } from "@/lib/data/requirements";
import { validateCoreRequirements } from "./core-rules";
import { validateMajor } from "./major-rules";
import { validateCrossRules } from "./cross-rules";
import { trackCreditUnits } from "./cu-tracker";

interface ValidatePlanInput {
  /** All course IDs placed in quarters (not staging) */
  placedCourseIds: string[];
  /** All course IDs in the plan (including staging) */
  allCourseIds: string[];
  /** Quarter order for CU tracking */
  quarterOrder: Record<QuarterId, string[]>;
  /** Student's declared majors */
  majors: MajorCode[];
  /** Student's active waivers */
  waivers: WaiverConfig[];
}

/**
 * Run the full validation pipeline against a student's plan.
 *
 * Pipeline:
 * 1. Core requirement validation (13 requirements)
 * 2. Major requirement validation (per declared major)
 * 3. Cross-cutting rules (exclusions, double-counting, prohibited combos)
 * 4. Credit unit tracking (per-quarter, overloads, graduation range)
 *
 * Returns a complete ValidationResult consumed by UI components.
 */
export function validatePlan(input: ValidatePlanInput): ValidationResult {
  // 1. Core requirements
  const coreResult = validateCoreRequirements(getCoreRequirements(), {
    placedCourseIds: input.placedCourseIds,
    allCourseIds: input.allCourseIds,
    waivers: input.waivers,
    majors: input.majors,
  });

  // 2. Major requirements
  const majorResults = input.majors.map((majorCode) => {
    const majorReq = getMajorRequirement(majorCode);
    if (!majorReq) {
      return {
        progress: {
          majorCode,
          majorName: majorCode,
          totalCreditsRequired: 0,
          totalCreditsSatisfied: 0,
          percentComplete: 0,
        },
        errors: [],
        warnings: [],
      };
    }
    return validateMajor(majorReq, {
      placedCourseIds: input.placedCourseIds,
      allCourseIds: input.allCourseIds,
    });
  });

  // 3. Cross-cutting rules
  const crossResult = validateCrossRules({
    allCourseIds: input.allCourseIds,
    majors: input.majors,
  });

  // 4. Credit unit tracking
  const cuResult = trackCreditUnits({
    quarterOrder: input.quarterOrder,
  });

  // Merge results
  const allErrors = [
    ...coreResult.errors,
    ...majorResults.flatMap((r) => r.errors),
    ...crossResult.errors,
  ];

  const allWarnings = [
    ...coreResult.warnings,
    ...majorResults.flatMap((r) => r.warnings),
    ...crossResult.warnings,
    ...cuResult.warnings,
  ];

  // Check graduation CU range
  if (!cuResult.graduationProgress.isInRange && input.placedCourseIds.length > 0) {
    if (cuResult.totalCU < cuResult.graduationProgress.minimumCU) {
      allErrors.push({
        type: "insufficient_cu",
        message: `Total CU (${cuResult.totalCU}) is below graduation minimum of ${cuResult.graduationProgress.minimumCU}`,
      });
    }
    if (cuResult.totalCU > cuResult.graduationProgress.maximumCU) {
      allWarnings.push({
        type: "quarter_overload",
        message: `Total CU (${cuResult.totalCU}) exceeds graduation maximum of ${cuResult.graduationProgress.maximumCU}`,
        severity: "high",
      });
    }
  }

  const isValid = allErrors.length === 0;

  return {
    isValid,
    canMarkComplete: isValid,
    totalCU: cuResult.totalCU,
    warnings: allWarnings,
    errors: allErrors,
    coreProgress: coreResult.progress,
    majorProgress: majorResults.map((r) => r.progress),
    graduationProgress: cuResult.graduationProgress,
  };
}
