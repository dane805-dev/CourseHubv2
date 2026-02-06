import type { QuarterId, SemesterId } from "@/types/plan";

/** CU limit thresholds */
export const CU_LIMITS = {
  GRADUATION_MIN: 19,
  GRADUATION_MAX: 21,
  QUARTER_OVERLOAD_THRESHOLD: 2.75,
  SEMESTER_OVERLOAD_THRESHOLD: 5.5,
} as const;

/** CU load preference defaults (per quarter) */
export const CU_LOAD_DEFAULTS: Record<string, number> = {
  light: 2.0,
  normal: 2.5,
  heavy: 3.0,
};

/** All Wharton MBA departments */
export const DEPARTMENTS = [
  "ACCT",
  "BEPP",
  "FNCE",
  "HCMG",
  "LGST",
  "MGMT",
  "MKTG",
  "OIDD",
  "REAL",
  "STAT",
  "WHCP",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

/** Map quarter IDs to their parent semester */
export const QUARTER_TO_SEMESTER: Record<QuarterId, SemesterId> = {
  Y1F_Q1: "Y1F",
  Y1F_Q2: "Y1F",
  Y1S_Q3: "Y1S",
  Y1S_Q4: "Y1S",
  Y2F_Q5: "Y2F",
  Y2F_Q6: "Y2F",
  Y2S_Q7: "Y2S",
  Y2S_Q8: "Y2S",
};

/** Map quarter IDs to the term (Fall/Spring) */
export const QUARTER_TO_TERM: Record<QuarterId, "Fall" | "Spring"> = {
  Y1F_Q1: "Fall",
  Y1F_Q2: "Fall",
  Y1S_Q3: "Spring",
  Y1S_Q4: "Spring",
  Y2F_Q5: "Fall",
  Y2F_Q6: "Fall",
  Y2S_Q7: "Spring",
  Y2S_Q8: "Spring",
};

/**
 * ISP (Independent Study) course ID patterns.
 * Courses ending in 8990 or 8980 are typically ISP.
 */
export function isISPCourse(courseId: string): boolean {
  return courseId.endsWith("8990") || courseId.endsWith("8980");
}

/**
 * Global Modular course ID patterns.
 * Courses ending in 8930, 8950, 8960, 8970 are typically Global Modular.
 */
export function isGlobalModularCourse(courseId: string): boolean {
  return (
    courseId.endsWith("8930") ||
    courseId.endsWith("8950") ||
    courseId.endsWith("8960") ||
    courseId.endsWith("8970")
  );
}

/**
 * Check if a course counts toward ISP/Global Modular cap.
 */
export function isISPOrGlobalModular(courseId: string): boolean {
  return isISPCourse(courseId) || isGlobalModularCourse(courseId);
}
