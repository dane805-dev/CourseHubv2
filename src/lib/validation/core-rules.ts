import type { CoreRequirement } from "@/types/requirements";
import type { CoreProgress, CoreRequirementStatus, ValidationError, ValidationWarning } from "@/types/validation";
import type { WaiverConfig, MajorCode } from "@/types/user";
import { getCreditUnits } from "@/lib/data/course-resolver";

interface CoreValidationInput {
  /** All course IDs placed in quarters (not staging) */
  placedCourseIds: string[];
  /** All course IDs in the plan (including staging) */
  allCourseIds: string[];
  /** Student's active waivers */
  waivers: WaiverConfig[];
  /** Student's declared majors */
  majors: MajorCode[];
}

interface CoreValidationOutput {
  progress: CoreProgress[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validate all 13 core requirements against the student's plan.
 */
export function validateCoreRequirements(
  coreRequirements: CoreRequirement[],
  input: CoreValidationInput
): CoreValidationOutput {
  const progress: CoreProgress[] = [];
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const req of coreRequirements) {
    const result = validateSingleCore(req, input);
    progress.push(result.progress);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  // Check prohibited combinations
  checkProhibitedCombinations(input.allCourseIds, errors);

  // Check finance major core overrides
  checkFinanceMajorOverrides(input.allCourseIds, input.majors, errors);

  return { progress, errors, warnings };
}

function validateSingleCore(
  req: CoreRequirement,
  input: CoreValidationInput
): { progress: CoreProgress; errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if this core is waived
  const waiver = input.waivers.find((w) => w.coreCode === req.core_code);

  if (waiver) {
    return handleWaivedCore(req, waiver, input, errors, warnings);
  }

  // Not waived — check if any matching course is in the plan
  const matchingCourses = req.courses.filter((c) => input.allCourseIds.includes(c));

  if (matchingCourses.length === 0) {
    // Missing
    errors.push({
      type: "missing_core",
      message: `Missing core requirement: ${req.core_name}`,
      requirementCode: req.core_code,
    });

    return {
      progress: {
        coreCode: req.core_code,
        coreName: req.core_name,
        status: "missing",
        creditsRequired: req.credits_required,
        creditsSatisfied: 0,
        satisfyingCourses: [],
      },
      errors,
      warnings,
    };
  }

  // Has at least one matching course — check CU
  const totalCU = matchingCourses.reduce((sum, cId) => {
    return sum + (getCreditUnits(cId) ?? 0);
  }, 0);

  // Special cases for OIDD flex:
  // Need 1.0 CU total, can be achieved with two 0.5 CU courses
  // For other flex cores (FNCE6210/FNCE6230), any course from the list satisfies the requirement
  let status: CoreRequirementStatus = "satisfied";

  if (req.core_code === "OIDD_FLEX") {
    // OIDD flex specifically needs 1.0 CU total
    if (totalCU < req.credits_required) {
      status = "partial";
      errors.push({
        type: "missing_core",
        message: `OIDD flex core partially complete: ${totalCU}/${req.credits_required} CU. Need ${req.credits_required - totalCU} more CU.`,
        requirementCode: req.core_code,
      });
    }
  }
  // For all other cores: if any course from the courses array is in the plan,
  // the requirement is satisfied (handles FNCE6210/FNCE6230 abbreviated versions)

  return {
    progress: {
      coreCode: req.core_code,
      coreName: req.core_name,
      status,
      creditsRequired: req.credits_required,
      creditsSatisfied: Math.min(totalCU, req.credits_required),
      satisfyingCourses: matchingCourses,
    },
    errors,
    warnings,
  };
}

function handleWaivedCore(
  req: CoreRequirement,
  waiver: WaiverConfig,
  input: CoreValidationInput,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): { progress: CoreProgress; errors: ValidationError[]; warnings: ValidationWarning[] } {
  if (waiver.waiverType === "full") {
    // Full waiver — requirement satisfied, no course needed
    return {
      progress: {
        coreCode: req.core_code,
        coreName: req.core_name,
        status: "waived",
        creditsRequired: req.credits_required,
        creditsSatisfied: req.credits_required,
        satisfyingCourses: [],
      },
      errors,
      warnings,
    };
  }

  if (waiver.waiverType === "substitution" && req.waiver_details) {
    // Substitution — student must take an upper-level course from eligible prefixes
    const eligiblePrefixes = req.waiver_details.substitution_requirement.eligible_course_prefixes;
    const subCreditsRequired = req.waiver_details.substitution_requirement.credits_required;

    // Find substitution courses in the plan
    const subCourses = input.allCourseIds.filter((cId) =>
      eligiblePrefixes.some((prefix) => cId.startsWith(prefix))
    );

    // Also check if the student specified a specific substitution course
    if (waiver.substitutionCourseId && input.allCourseIds.includes(waiver.substitutionCourseId)) {
      if (!subCourses.includes(waiver.substitutionCourseId)) {
        subCourses.push(waiver.substitutionCourseId);
      }
    }

    const subCU = subCourses.reduce((sum, cId) => sum + (getCreditUnits(cId) ?? 0), 0);

    if (subCU >= subCreditsRequired) {
      return {
        progress: {
          coreCode: req.core_code,
          coreName: req.core_name,
          status: "waived",
          creditsRequired: subCreditsRequired,
          creditsSatisfied: subCU,
          satisfyingCourses: subCourses,
        },
        errors,
        warnings,
      };
    }

    // Substitution course not yet in plan
    errors.push({
      type: "missing_core",
      message: `${req.core_name} waived but substitution not complete: need ${subCreditsRequired} CU from ${eligiblePrefixes.join("/")} courses`,
      requirementCode: req.core_code,
    });

    return {
      progress: {
        coreCode: req.core_code,
        coreName: req.core_name,
        status: "partial",
        creditsRequired: subCreditsRequired,
        creditsSatisfied: subCU,
        satisfyingCourses: subCourses,
      },
      errors,
      warnings,
    };
  }

  if (waiver.waiverType === "half_credit") {
    // Half-credit waiver — student takes half-credit version
    const matchingCourses = req.courses.filter((c) => input.allCourseIds.includes(c));
    const totalCU = matchingCourses.reduce((sum, cId) => sum + (getCreditUnits(cId) ?? 0), 0);

    return {
      progress: {
        coreCode: req.core_code,
        coreName: req.core_name,
        status: matchingCourses.length > 0 ? "satisfied" : "partial",
        creditsRequired: req.credits_required / 2,
        creditsSatisfied: totalCU,
        satisfyingCourses: matchingCourses,
      },
      errors,
      warnings,
    };
  }

  // Fallback
  return {
    progress: {
      coreCode: req.core_code,
      coreName: req.core_name,
      status: "waived",
      creditsRequired: 0,
      creditsSatisfied: 0,
      satisfyingCourses: [],
    },
    errors,
    warnings,
  };
}

/**
 * Cannot take both FNCE6210 and FNCE6230 (universal prohibition).
 */
function checkProhibitedCombinations(
  allCourseIds: string[],
  errors: ValidationError[]
): void {
  if (allCourseIds.includes("FNCE6210") && allCourseIds.includes("FNCE6230")) {
    errors.push({
      type: "prohibited_combination",
      message: "Cannot enroll in both FNCE6210 and FNCE6230",
      courseIds: ["FNCE6210", "FNCE6230"],
    });
  }
}

/**
 * Finance and Quantitative Finance majors must take FNCE6110 (not FNCE6210)
 * and FNCE6130 (not FNCE6230).
 */
function checkFinanceMajorOverrides(
  allCourseIds: string[],
  majors: MajorCode[],
  errors: ValidationError[]
): void {
  const isFinanceMajor = majors.includes("FNCE") || majors.includes("QFNC");
  if (!isFinanceMajor) return;

  if (allCourseIds.includes("FNCE6210") && !allCourseIds.includes("FNCE6110")) {
    errors.push({
      type: "major_core_override",
      message: "Finance/Quant Finance majors must take FNCE6110 (full course), not FNCE6210 (abbreviated)",
      requirementCode: "FNCE_CORP_FLEX",
      courseIds: ["FNCE6210"],
    });
  }

  if (allCourseIds.includes("FNCE6230") && !allCourseIds.includes("FNCE6130")) {
    errors.push({
      type: "major_core_override",
      message: "Finance/Quant Finance majors must take FNCE6130 (full course), not FNCE6230 (abbreviated)",
      requirementCode: "FNCE_MACRO_FLEX",
      courseIds: ["FNCE6230"],
    });
  }
}
