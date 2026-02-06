export type WarningSeverity = "low" | "medium" | "high";

export type WarningType =
  | "prerequisite"
  | "quarter_overload"
  | "term_mismatch"
  | "double_count"
  | "isp_cap"
  | "prohibited_combo";

export type ErrorType =
  | "missing_core"
  | "missing_major_required"
  | "missing_major_elective"
  | "insufficient_cu"
  | "mutual_exclusion"
  | "prohibited_combination"
  | "major_core_override";

export interface ValidationWarning {
  type: WarningType;
  courseId?: string;
  message: string;
  severity: WarningSeverity;
  relatedCourseIds?: string[];
}

export interface ValidationError {
  type: ErrorType;
  message: string;
  requirementCode?: string;
  courseIds?: string[];
}

export type CoreRequirementStatus = "satisfied" | "partial" | "missing" | "waived";

export interface CoreProgress {
  coreCode: string;
  coreName: string;
  status: CoreRequirementStatus;
  creditsRequired: number;
  creditsSatisfied: number;
  satisfyingCourses: string[];
}

export interface MajorProgress {
  majorCode: string;
  majorName: string;
  totalCreditsRequired: number;
  totalCreditsSatisfied: number;
  percentComplete: number;
  requiredCoursesProgress?: {
    creditsRequired: number;
    creditsSatisfied: number;
    satisfyingCourses: string[];
    missingCourses: string[];
  };
  electiveCoursesProgress?: {
    creditsRequired: number;
    creditsSatisfied: number;
    satisfyingCourses: string[];
  };
  pillarProgress?: {
    pillarCode: string;
    pillarName: string;
    creditsRequired: number;
    creditsSatisfied: number;
    creditsType?: string;
    satisfyingCourses: string[];
  }[];
}

export interface GraduationProgress {
  totalCU: number;
  minimumCU: number;
  maximumCU: number;
  isInRange: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  canMarkComplete: boolean;
  totalCU: number;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  coreProgress: CoreProgress[];
  majorProgress: MajorProgress[];
  graduationProgress: GraduationProgress;
}
