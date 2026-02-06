import type {
  CoreRequirement,
  CoreRequirementsFile,
  MajorRequirement,
  MajorRequirementsFile,
} from "@/types/requirements";

// Import requirements JSON at build time
import coreReqData from "../../../Student Requirements/wharton_mba_core_requirements.json";
import majorReqData from "../../../Student Requirements/wharton_mba_major_requirements.json";

// Cast to typed interfaces
const coreRequirements = coreReqData as unknown as CoreRequirementsFile;
const majorRequirements = majorReqData as unknown as MajorRequirementsFile;

// ─── Core Requirements Accessors ───

/** Get all 13 core requirements */
export function getCoreRequirements(): CoreRequirement[] {
  return coreRequirements.core_requirements;
}

/** Get a specific core requirement by code */
export function getCoreRequirement(coreCode: string): CoreRequirement | undefined {
  return coreRequirements.core_requirements.find((r) => r.core_code === coreCode);
}

/** Get only fixed core requirements */
export function getFixedCoreRequirements(): CoreRequirement[] {
  return coreRequirements.core_requirements.filter((r) => r.core_type === "fixed");
}

/** Get only flexible core requirements */
export function getFlexCoreRequirements(): CoreRequirement[] {
  return coreRequirements.core_requirements.filter((r) => r.core_type === "flex");
}

/** Get waivable core requirements */
export function getWaivableCoreRequirements(): CoreRequirement[] {
  return coreRequirements.core_requirements.filter((r) => r.waivable);
}

/** Get total core credits required */
export function getTotalCoreCreditRequired(): number {
  return coreRequirements.total_core_credits_required;
}

/** Get the core requirements validation rules */
export function getCoreValidationRules() {
  return coreRequirements.validation_rules;
}

// ─── Major Requirements Accessors ───

/** Get all 21 major requirements */
export function getAllMajors(): Record<string, MajorRequirement> {
  return majorRequirements.majors;
}

/** Get a specific major by code */
export function getMajorRequirement(majorCode: string): MajorRequirement | undefined {
  return majorRequirements.majors[majorCode];
}

/** Get all major codes */
export function getMajorCodes(): string[] {
  return Object.keys(majorRequirements.majors);
}

/** Get all course IDs referenced in a major's requirements */
export function getMajorCourseIds(majorCode: string): string[] {
  const major = majorRequirements.majors[majorCode];
  if (!major) return [];

  const courseIds = new Set<string>();
  const reqs = major.requirements;

  if ("required_courses" in reqs) {
    reqs.required_courses.courses.forEach((c) => courseIds.add(c));
  }
  if ("elective_courses" in reqs) {
    reqs.elective_courses.courses.forEach((c) => courseIds.add(c));
    reqs.elective_courses.non_wharton_courses?.forEach((c) => courseIds.add(c));
  }
  if ("pillars" in reqs) {
    reqs.pillars.forEach((p) => p.courses.forEach((c) => courseIds.add(c)));
  }

  return Array.from(courseIds);
}

/**
 * Check if a course ID fulfills any requirement for a given major.
 * Returns true if the course appears in any part of the major's requirements.
 */
export function courseCountsForMajor(courseId: string, majorCode: string): boolean {
  const courses = getMajorCourseIds(majorCode);
  return courses.includes(courseId);
}

/**
 * Given a course ID, find all core requirements it can satisfy.
 */
export function findCoreRequirementsForCourse(courseId: string): CoreRequirement[] {
  return coreRequirements.core_requirements.filter((r) =>
    r.courses.includes(courseId)
  );
}

/**
 * Given a course ID, find all majors it counts toward.
 */
export function findMajorsForCourse(courseId: string): string[] {
  const result: string[] = [];
  for (const [code, major] of Object.entries(majorRequirements.majors)) {
    if (courseCountsForMajor(courseId, code)) {
      result.push(major.major_code);
    }
  }
  return result;
}
