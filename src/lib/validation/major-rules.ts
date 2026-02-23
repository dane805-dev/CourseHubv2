import type {
  MajorRequirement,
  CombinedRequirements,
  ElectivesRequirements,
  PillarsRequirements,
  CombinedPillarsRequirements,
} from "@/types/requirements";
import type { MajorProgress, ValidationError, ValidationWarning } from "@/types/validation";
import { getCreditUnits } from "@/lib/data/course-resolver";
import { isISPOrGlobalModular } from "@/lib/data/constants";

interface MajorValidationInput {
  /** All course IDs placed in quarters (not staging) */
  placedCourseIds: string[];
  /** All course IDs in the plan (including staging) */
  allCourseIds: string[];
}

interface MajorValidationOutput {
  progress: MajorProgress;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validate a single major's requirements against the student's plan.
 */
export function validateMajor(
  major: MajorRequirement,
  input: MajorValidationInput
): MajorValidationOutput {
  switch (major.requirement_structure) {
    case "ELECTIVES":
      return validateElectives(major, input);
    case "COMBINED":
      return validateCombined(major, input);
    case "PILLARS":
      return validatePillars(major, input);
    case "COMBINED_PILLARS":
      return validateCombinedPillars(major, input);
    default:
      return {
        progress: createEmptyProgress(major),
        errors: [],
        warnings: [],
      };
  }
}

// ─── ELECTIVES Structure ───

function validateElectives(
  major: MajorRequirement,
  input: MajorValidationInput
): MajorValidationOutput {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const reqs = major.requirements as ElectivesRequirements;

  const matching = findMatchingCourses(
    input.allCourseIds,
    reqs.elective_courses.courses
  );

  // Handle non-Wharton courses if applicable
  let nonWhartonCU = 0;
  if (reqs.elective_courses.non_wharton_courses) {
    const nonWhartonMatching = findMatchingCourses(
      input.allCourseIds,
      reqs.elective_courses.non_wharton_courses
    );
    nonWhartonCU = sumCreditUnits(nonWhartonMatching);

    const maxNonWharton = reqs.elective_courses.non_wharton_max_credits ?? 0;
    if (nonWhartonCU > maxNonWharton) {
      warnings.push({
        type: "isp_cap",
        message: `${major.major_name}: non-Wharton courses exceed ${maxNonWharton} CU limit (${nonWhartonCU} CU used)`,
        severity: "medium",
      });
      nonWhartonCU = maxNonWharton; // Cap the contribution
    }
    matching.push(...nonWhartonMatching);
  }

  // Handle additional courses pool
  handleAdditionalCourses(input.allCourseIds, reqs.elective_courses, matching, major, warnings);

  const totalCU = sumCreditUnits(matching);

  // Check ISP/Global Modular cap
  checkISPCap(matching, major, warnings);

  // Check prohibited combinations within major
  checkMajorProhibitedCombos(major, input.allCourseIds, warnings);

  if (totalCU < reqs.elective_courses.credits_required) {
    errors.push({
      type: "missing_major_elective",
      message: `${major.major_name}: need ${reqs.elective_courses.credits_required - totalCU} more CU of electives`,
      requirementCode: major.major_code,
    });
  }

  const percentComplete = Math.min(
    100,
    Math.round((totalCU / major.total_credits_required) * 100)
  );

  return {
    progress: {
      majorCode: major.major_code,
      majorName: major.major_name,
      totalCreditsRequired: major.total_credits_required,
      totalCreditsSatisfied: totalCU,
      percentComplete,
      electiveCoursesProgress: {
        creditsRequired: reqs.elective_courses.credits_required,
        creditsSatisfied: totalCU,
        satisfyingCourses: matching,
      },
    },
    errors,
    warnings,
  };
}

// ─── COMBINED Structure ───

function validateCombined(
  major: MajorRequirement,
  input: MajorValidationInput
): MajorValidationOutput {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const reqs = major.requirements as CombinedRequirements;

  // Required courses
  const selectionType = reqs.required_courses.selection_type ?? "all";
  const reqMatching = findMatchingCourses(
    input.allCourseIds,
    reqs.required_courses.courses
  );
  const reqCU = sumCreditUnits(reqMatching);
  let reqMissing: string[] = [];

  if (selectionType === "all") {
    // "all" mode: report each missing course by name
    reqMissing = reqs.required_courses.courses.filter(
      (c) => !input.allCourseIds.includes(c)
    );

    // For BUAN: required_courses.credits_required is 0.0 (they are prerequisites, not major CU)
    // We still want to check they're present
    if (reqs.required_courses.credits_required > 0 && reqCU < reqs.required_courses.credits_required) {
      errors.push({
        type: "missing_major_required",
        message: `${major.major_name}: required courses incomplete (${reqCU}/${reqs.required_courses.credits_required} CU)`,
        requirementCode: major.major_code,
        courseIds: reqMissing,
      });
    }
  } else {
    // "choose" mode: report remaining options (not yet taken)
    reqMissing = reqs.required_courses.courses.filter(
      (c) => !input.allCourseIds.includes(c)
    );
    if (reqs.required_courses.credits_required > 0 && reqCU < reqs.required_courses.credits_required) {
      const needed = reqs.required_courses.credits_required - reqCU;
      errors.push({
        type: "missing_major_required",
        message: `${major.major_name}: need ${needed} more CU of required courses`,
        requirementCode: major.major_code,
      });
    }
  }

  // Elective courses
  const electMatching = findMatchingCourses(
    input.allCourseIds,
    reqs.elective_courses.courses
  );

  // Handle non-Wharton electives
  if (reqs.elective_courses.non_wharton_courses) {
    const nonWhartonMatching = findMatchingCourses(
      input.allCourseIds,
      reqs.elective_courses.non_wharton_courses
    );
    const nonWhartonCU = sumCreditUnits(nonWhartonMatching);
    const maxNonWharton = reqs.elective_courses.non_wharton_max_credits ?? 0;

    if (nonWhartonCU > maxNonWharton) {
      warnings.push({
        type: "isp_cap",
        message: `${major.major_name}: non-Wharton courses exceed ${maxNonWharton} CU limit`,
        severity: "medium",
      });
    }
    electMatching.push(...nonWhartonMatching);
  }

  // Handle additional courses pool
  handleAdditionalCourses(input.allCourseIds, reqs.elective_courses, electMatching, major, warnings);

  const electCU = sumCreditUnits(electMatching);

  if (electCU < reqs.elective_courses.credits_required) {
    errors.push({
      type: "missing_major_elective",
      message: `${major.major_name}: need ${reqs.elective_courses.credits_required - electCU} more CU of electives`,
      requirementCode: major.major_code,
    });
  }

  checkISPCap([...reqMatching, ...electMatching], major, warnings);
  checkMajorProhibitedCombos(major, input.allCourseIds, warnings);

  const totalCU = reqCU + electCU;
  const percentComplete = Math.min(
    100,
    Math.round((totalCU / major.total_credits_required) * 100)
  );

  return {
    progress: {
      majorCode: major.major_code,
      majorName: major.major_name,
      totalCreditsRequired: major.total_credits_required,
      totalCreditsSatisfied: totalCU,
      percentComplete,
      requiredCoursesProgress: {
        creditsRequired: reqs.required_courses.credits_required,
        creditsSatisfied: reqCU,
        satisfyingCourses: reqMatching,
        missingCourses: reqMissing,
        selectionType,
      },
      electiveCoursesProgress: {
        creditsRequired: reqs.elective_courses.credits_required,
        creditsSatisfied: electCU,
        satisfyingCourses: electMatching,
      },
    },
    errors,
    warnings,
  };
}

// ─── PILLARS Structure ───

function validatePillars(
  major: MajorRequirement,
  input: MajorValidationInput
): MajorValidationOutput {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const reqs = major.requirements as PillarsRequirements;

  const pillarProgress: MajorProgress["pillarProgress"] = [];
  let totalCU = 0;

  for (const pillar of reqs.pillars) {
    const matching = findMatchingCourses(input.allCourseIds, pillar.courses);
    const pillarCU = sumCreditUnits(matching);
    const missing = pillar.courses.filter((c) => !input.allCourseIds.includes(c));

    pillarProgress.push({
      pillarCode: pillar.pillar_code,
      pillarName: pillar.pillar_name,
      creditsRequired: pillar.credits_required,
      creditsSatisfied: pillarCU,
      creditsType: pillar.credits_type,
      satisfyingCourses: matching,
      missingCourses: missing,
    });

    if (pillar.credits_type === "minimum" && pillarCU < pillar.credits_required) {
      errors.push({
        type: "missing_major_elective",
        message: `${major.major_name} - ${pillar.pillar_name}: need ${pillar.credits_required - pillarCU} more CU (minimum ${pillar.credits_required})`,
        requirementCode: `${major.major_code}_${pillar.pillar_code}`,
      });
    }

    if (pillar.credits_type === "maximum" && pillarCU > pillar.credits_required) {
      warnings.push({
        type: "isp_cap",
        message: `${major.major_name} - ${pillar.pillar_name}: exceeds maximum of ${pillar.credits_required} CU (${pillarCU} CU used)`,
        severity: "medium",
      });
    }

    // For "combined_with_other_pillars", we add to total and check at end
    totalCU += pillarCU;
  }

  // For combined_with_other_pillars type (ESGB): total must reach credits_required
  const hasCombined = reqs.pillars.some(
    (p) => p.credits_type === "combined_with_other_pillars"
  );
  if (hasCombined && totalCU < major.total_credits_required) {
    errors.push({
      type: "insufficient_cu",
      message: `${major.major_name}: need ${major.total_credits_required - totalCU} more CU total across all pillars`,
      requirementCode: major.major_code,
    });
  }

  checkMajorProhibitedCombos(major, input.allCourseIds, warnings);

  const percentComplete = Math.min(
    100,
    Math.round((totalCU / major.total_credits_required) * 100)
  );

  return {
    progress: {
      majorCode: major.major_code,
      majorName: major.major_name,
      totalCreditsRequired: major.total_credits_required,
      totalCreditsSatisfied: totalCU,
      percentComplete,
      pillarProgress,
    },
    errors,
    warnings,
  };
}

// ─── COMBINED_PILLARS Structure ───

function validateCombinedPillars(
  major: MajorRequirement,
  input: MajorValidationInput
): MajorValidationOutput {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const reqs = major.requirements as CombinedPillarsRequirements;

  // Required courses
  const selectionType = reqs.required_courses.selection_type ?? "all";
  const reqMatching = findMatchingCourses(
    input.allCourseIds,
    reqs.required_courses.courses
  );
  const reqCU = sumCreditUnits(reqMatching);
  let reqMissing: string[] = [];

  if (selectionType === "all") {
    reqMissing = reqs.required_courses.courses.filter(
      (c) => !input.allCourseIds.includes(c)
    );

    if (reqCU < reqs.required_courses.credits_required) {
      errors.push({
        type: "missing_major_required",
        message: `${major.major_name}: required courses incomplete (${reqCU}/${reqs.required_courses.credits_required} CU)`,
        requirementCode: major.major_code,
        courseIds: reqMissing,
      });
    }
  } else {
    // "choose" mode: report remaining options (not yet taken)
    reqMissing = reqs.required_courses.courses.filter(
      (c) => !input.allCourseIds.includes(c)
    );
    if (reqCU < reqs.required_courses.credits_required) {
      const needed = reqs.required_courses.credits_required - reqCU;
      errors.push({
        type: "missing_major_required",
        message: `${major.major_name}: need ${needed} more CU of required courses`,
        requirementCode: major.major_code,
      });
    }
  }

  // Pillars
  const pillarProgress: MajorProgress["pillarProgress"] = [];
  let pillarTotalCU = 0;

  for (const pillar of reqs.pillars) {
    const matching = findMatchingCourses(input.allCourseIds, pillar.courses);
    const pillarCU = sumCreditUnits(matching);
    const missing = pillar.courses.filter((c) => !input.allCourseIds.includes(c));

    pillarProgress.push({
      pillarCode: pillar.pillar_code,
      pillarName: pillar.pillar_name,
      creditsRequired: pillar.credits_required,
      creditsSatisfied: pillarCU,
      creditsType: pillar.credits_type,
      satisfyingCourses: matching,
      missingCourses: missing,
    });

    if (pillarCU < pillar.credits_required) {
      errors.push({
        type: "missing_major_elective",
        message: `${major.major_name} - ${pillar.pillar_name}: need ${pillar.credits_required - pillarCU} more CU`,
        requirementCode: `${major.major_code}_${pillar.pillar_code}`,
      });
    }

    pillarTotalCU += pillarCU;
  }

  checkISPCap([...reqMatching], major, warnings);
  checkMajorProhibitedCombos(major, input.allCourseIds, warnings);

  const totalCU = reqCU + pillarTotalCU;
  const percentComplete = Math.min(
    100,
    Math.round((totalCU / major.total_credits_required) * 100)
  );

  return {
    progress: {
      majorCode: major.major_code,
      majorName: major.major_name,
      totalCreditsRequired: major.total_credits_required,
      totalCreditsSatisfied: totalCU,
      percentComplete,
      requiredCoursesProgress: {
        creditsRequired: reqs.required_courses.credits_required,
        creditsSatisfied: reqCU,
        satisfyingCourses: reqMatching,
        missingCourses: reqMissing,
        selectionType,
      },
      pillarProgress,
    },
    errors,
    warnings,
  };
}

// ─── Helper Functions ───

/**
 * Handle additional_courses pool for elective requirements.
 * Pushes non-overlapping matches into the matching array and warns if cap exceeded.
 */
function handleAdditionalCourses(
  allCourseIds: string[],
  elective: { additional_courses?: { courses: string[]; max_credits?: number; description?: string } },
  existingMatching: string[],
  major: MajorRequirement,
  warnings: ValidationWarning[]
): void {
  if (!elective.additional_courses) return;

  const additionalMatching = findMatchingCourses(
    allCourseIds,
    elective.additional_courses.courses
  );
  // Cap check uses ALL matches from the pool (including courses also on primary list)
  const additionalCU = sumCreditUnits(additionalMatching);

  if (elective.additional_courses.max_credits != null && additionalCU > elective.additional_courses.max_credits) {
    warnings.push({
      type: "isp_cap",
      message: `${major.major_name}: additional-pool courses exceed ${elective.additional_courses.max_credits} CU limit (${additionalCU} CU used)`,
      severity: "medium",
    });
  }

  // Only push courses not already counted via the primary list
  const newCourses = additionalMatching.filter((c) => !existingMatching.includes(c));
  existingMatching.push(...newCourses);
}

function findMatchingCourses(planCourseIds: string[], requirementCourseIds: string[]): string[] {
  return planCourseIds.filter((id) => requirementCourseIds.includes(id));
}

function sumCreditUnits(courseIds: string[]): number {
  return courseIds.reduce((sum, id) => sum + (getCreditUnits(id) ?? 0), 0);
}

/**
 * Check ISP/Global Modular cap (most majors limit to 1.0 CU).
 */
function checkISPCap(
  matchingCourses: string[],
  major: MajorRequirement,
  warnings: ValidationWarning[]
): void {
  const ispGmCourses = matchingCourses.filter(isISPOrGlobalModular);
  const ispGmCU = sumCreditUnits(ispGmCourses);

  if (ispGmCU > 1.0) {
    warnings.push({
      type: "isp_cap",
      message: `${major.major_name}: ISP/Global Modular courses exceed 1.0 CU cap (${ispGmCU} CU)`,
      severity: "high",
      relatedCourseIds: ispGmCourses,
    });
  }
}

/**
 * Check major-specific prohibited course combinations.
 */
function checkMajorProhibitedCombos(
  major: MajorRequirement,
  allCourseIds: string[],
  warnings: ValidationWarning[]
): void {
  const combos: { majorCode: string; pairs: [string, string][]; }[] = [
    { majorCode: "MKTG", pairs: [["MKTG7700", "MKTG7270"], ["MKTG7380", "MKTG8500"]] },
    { majorCode: "MKOP", pairs: [["MKTG7700", "MKTG7270"], ["MKTG7380", "MKTG8500"]] },
    { majorCode: "BUAN", pairs: [["MKTG7520", "MKTG8520"]] },
    { majorCode: "ENTR", pairs: [["MGMT6910", "MGMT6920"]] },
  ];

  for (const combo of combos) {
    if (combo.majorCode !== major.major_code) continue;

    for (const [a, b] of combo.pairs) {
      if (allCourseIds.includes(a) && allCourseIds.includes(b)) {
        warnings.push({
          type: "prohibited_combo",
          message: `${major.major_name}: cannot count both ${a} and ${b} toward this major`,
          severity: "high",
          courseId: a,
          relatedCourseIds: [a, b],
        });
      }
    }
  }
}

function createEmptyProgress(major: MajorRequirement): MajorProgress {
  return {
    majorCode: major.major_code,
    majorName: major.major_name,
    totalCreditsRequired: major.total_credits_required,
    totalCreditsSatisfied: 0,
    percentComplete: 0,
  };
}
