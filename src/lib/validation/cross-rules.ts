import type { ValidationError, ValidationWarning } from "@/types/validation";
import type { MajorCode } from "@/types/user";
import { MAJOR_EXCLUSIONS, MKOP_EXCLUSIONS } from "@/types/user";

interface CrossRulesInput {
  allCourseIds: string[];
  majors: MajorCode[];
}

interface CrossRulesOutput {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validate cross-cutting rules that span multiple requirements.
 */
export function validateCrossRules(input: CrossRulesInput): CrossRulesOutput {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validateMutualMajorExclusions(input.majors, errors);
  validateDoubleCountingRestrictions(input.allCourseIds, input.majors, warnings);

  return { errors, warnings };
}

/**
 * Check mutual major exclusions:
 * - FNCE ↔ QFNC
 * - ESGB ↔ BEES
 * - ESGB ↔ SOGO
 * - MKOP ↔ MKTG, MKOP ↔ OIDD
 */
function validateMutualMajorExclusions(
  majors: MajorCode[],
  errors: ValidationError[]
): void {
  for (const [a, b] of MAJOR_EXCLUSIONS) {
    if (majors.includes(a) && majors.includes(b)) {
      errors.push({
        type: "mutual_exclusion",
        message: `Cannot declare both ${a} and ${b} majors`,
      });
    }
  }

  // MKOP exclusions
  if (majors.includes("MKOP")) {
    for (const excluded of MKOP_EXCLUSIONS) {
      if (majors.includes(excluded)) {
        errors.push({
          type: "mutual_exclusion",
          message: `Cannot declare both MKOP and ${excluded} majors`,
        });
      }
    }
  }
}

/**
 * Double-counting restrictions:
 * Certain courses cannot count toward both a major and OIDD flex core.
 *
 * Rules:
 * - OIDD6130, OIDD6620: cannot count toward both AIFB major AND OIDD flex core
 * - OIDD6140, OIDD6620: cannot count toward both ENTR major AND OIDD flex core
 * - OIDD6900: cannot count toward both LEAD/MGMT major AND OIDD flex core
 *
 * For MVP: warn the user and default to counting toward the major.
 */
function validateDoubleCountingRestrictions(
  allCourseIds: string[],
  majors: MajorCode[],
  warnings: ValidationWarning[]
): void {
  const rules: { courses: string[]; major: MajorCode; context: string }[] = [
    { courses: ["OIDD6130", "OIDD6620"], major: "AIFB", context: "OIDD flex core" },
    { courses: ["OIDD6140", "OIDD6620"], major: "ENTR", context: "OIDD flex core" },
    { courses: ["OIDD6900"], major: "LEAD", context: "OIDD flex core" },
    { courses: ["OIDD6900"], major: "MGMT", context: "OIDD flex core" },
  ];

  for (const rule of rules) {
    if (!majors.includes(rule.major)) continue;

    for (const courseId of rule.courses) {
      if (allCourseIds.includes(courseId)) {
        warnings.push({
          type: "double_count",
          courseId,
          message: `${courseId} cannot count toward both ${rule.major} major and ${rule.context}. It will count toward ${rule.major} major.`,
          severity: "high",
          relatedCourseIds: [courseId],
        });
      }
    }
  }
}
