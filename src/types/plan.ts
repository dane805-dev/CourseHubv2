export type QuarterId =
  | "Y1F_Q1"
  | "Y1F_Q2"
  | "Y1S_Q3"
  | "Y1S_Q4"
  | "Y2F_Q5"
  | "Y2F_Q6"
  | "Y2S_Q7"
  | "Y2S_Q8";

export type SemesterId = "Y1F" | "Y1S" | "Y2F" | "Y2S";

/** Location of a course in the plan: staging area or a specific quarter */
export type PlanLocation = "staging" | QuarterId;

/** A course placed in the plan */
export interface Placement {
  courseId: string;
  location: PlanLocation;
  sortOrder: number;
  creditUnits: number;
}

/** The full plan record from the database */
export interface Plan {
  id: string;
  userId: string;
  planName: string;
  isComplete: boolean;
  totalCu: number;
  createdAt: string;
  updatedAt: string;
}

/** Quarter metadata for display */
export interface QuarterInfo {
  id: QuarterId;
  label: string;
  semester: SemesterId;
  term: "Fall" | "Spring";
  year: 1 | 2;
  quarterNumber: 1 | 2; // 1 = first half, 2 = second half of semester
}

export const QUARTER_IDS: QuarterId[] = [
  "Y1F_Q1",
  "Y1F_Q2",
  "Y1S_Q3",
  "Y1S_Q4",
  "Y2F_Q5",
  "Y2F_Q6",
  "Y2S_Q7",
  "Y2S_Q8",
];

export const SEMESTER_IDS: SemesterId[] = ["Y1F", "Y1S", "Y2F", "Y2S"];

export const QUARTER_INFO: Record<QuarterId, QuarterInfo> = {
  Y1F_Q1: { id: "Y1F_Q1", label: "Year 1 Fall (Q1)", semester: "Y1F", term: "Fall", year: 1, quarterNumber: 1 },
  Y1F_Q2: { id: "Y1F_Q2", label: "Year 1 Fall (Q2)", semester: "Y1F", term: "Fall", year: 1, quarterNumber: 2 },
  Y1S_Q3: { id: "Y1S_Q3", label: "Year 1 Spring (Q3)", semester: "Y1S", term: "Spring", year: 1, quarterNumber: 1 },
  Y1S_Q4: { id: "Y1S_Q4", label: "Year 1 Spring (Q4)", semester: "Y1S", term: "Spring", year: 1, quarterNumber: 2 },
  Y2F_Q5: { id: "Y2F_Q5", label: "Year 2 Fall (Q5)", semester: "Y2F", term: "Fall", year: 2, quarterNumber: 1 },
  Y2F_Q6: { id: "Y2F_Q6", label: "Year 2 Fall (Q6)", semester: "Y2F", term: "Fall", year: 2, quarterNumber: 2 },
  Y2S_Q7: { id: "Y2S_Q7", label: "Year 2 Spring (Q7)", semester: "Y2S", term: "Spring", year: 2, quarterNumber: 1 },
  Y2S_Q8: { id: "Y2S_Q8", label: "Year 2 Spring (Q8)", semester: "Y2S", term: "Spring", year: 2, quarterNumber: 2 },
};

export const SEMESTER_INFO: Record<SemesterId, { label: string; quarters: [QuarterId, QuarterId] }> = {
  Y1F: { label: "Year 1 Fall", quarters: ["Y1F_Q1", "Y1F_Q2"] },
  Y1S: { label: "Year 1 Spring", quarters: ["Y1S_Q3", "Y1S_Q4"] },
  Y2F: { label: "Year 2 Fall", quarters: ["Y2F_Q5", "Y2F_Q6"] },
  Y2S: { label: "Year 2 Spring", quarters: ["Y2S_Q7", "Y2S_Q8"] },
};

/** Returns true for semester-long courses (1.0+ CU). These courses span Q1+Q2 and are tracked in Q1. */
export function isSemesterLong(creditUnits: number): boolean {
  return creditUnits >= 1.0;
}

/**
 * Normalizes a target quarter for semester-long courses.
 * If a semester-long course is dropped onto Q2, redirects it to Q1 of the same semester.
 */
export function normalizeQuarterForCourse(quarterId: QuarterId, creditUnits: number): QuarterId {
  const info = QUARTER_INFO[quarterId];
  if (isSemesterLong(creditUnits) && info.quarterNumber === 2) {
    return SEMESTER_INFO[info.semester].quarters[0];
  }
  return quarterId;
}
