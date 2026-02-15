// ─── Core Requirements ───

export interface WaiverMethodOption {
  methods: ("credential" | "exam")[];
}

export interface SubstitutionOption {
  methods: ("credential" | "exam")[];
  credits_required: number;
  description: string;
  eligible_courses?: string[];
  eligible_course_prefixes?: string[];
}

export interface PlacementOption {
  methods: ("exam")[];
  description: string;
}

export interface WaiverDetails {
  waiver?: WaiverMethodOption;
  substitution?: SubstitutionOption;
  placement?: PlacementOption;
}

export interface CoreRequirement {
  core_code: string;
  core_name: string;
  core_type: "fixed" | "flex";
  credits_required: number;
  waivable: boolean;
  substitutable: boolean;
  placement_available: boolean;
  courses: string[];
  waiver_details?: WaiverDetails;
  notes: string;
}

export interface CoreValidationRules {
  fixed_core: { description: string; total_credits: number; note: string };
  flex_core: { description: string; total_credits: number; note: string };
  total_credits: { minimum: number; description: string };
  finance_major_requirements: { description: string; requirements: string[] };
  prohibited_combinations: {
    description: string;
    rules: { prohibited: string[]; reason: string }[];
  };
  waiver_timing: { description: string };
  substitution_timing: { description: string };
  letter_grade_requirement: { description: string };
  placement_rules: { description: string };
}

export interface CoreRequirementsFile {
  program: string;
  class: string;
  total_core_credits_required: number;
  core_requirements: CoreRequirement[];
  validation_rules: CoreValidationRules;
  summary: {
    fixed_core_count: number;
    flex_core_count: number;
    total_core_requirements: number;
    waivable_requirements: number;
    placement_available: number;
    total_fixed_credits: number;
    total_flex_credits: number;
  };
  metadata: {
    created_date: string;
    source_document: string;
    version: string;
    notes: string;
  };
}

// ─── Major Requirements ───

export type RequirementStructure = "ELECTIVES" | "COMBINED" | "PILLARS" | "COMBINED_PILLARS";

export interface ElectiveCourses {
  credits_required: number;
  courses: string[];
  non_wharton_max_credits?: number;
  non_wharton_courses?: string[];
}

export interface RequiredCourses {
  credits_required: number;
  courses: string[];
  selection_type?: "all" | "choose";
}

export interface Pillar {
  pillar_name: string;
  pillar_code: string;
  credits_required: number;
  credits_type?: "minimum" | "maximum" | "combined_with_other_pillars";
  courses: string[];
}

/** Requirements shape for ELECTIVES structure */
export interface ElectivesRequirements {
  elective_courses: ElectiveCourses;
}

/** Requirements shape for COMBINED structure */
export interface CombinedRequirements {
  required_courses: RequiredCourses;
  elective_courses: ElectiveCourses;
}

/** Requirements shape for PILLARS structure */
export interface PillarsRequirements {
  pillar_count: number;
  pillars: Pillar[];
}

/** Requirements shape for COMBINED_PILLARS structure */
export interface CombinedPillarsRequirements {
  required_courses: RequiredCourses;
  pillar_count: number;
  pillars: Pillar[];
}

export type MajorRequirementsData =
  | ElectivesRequirements
  | CombinedRequirements
  | PillarsRequirements
  | CombinedPillarsRequirements;

export interface MajorRequirement {
  major_name: string;
  major_code: string;
  total_credits_required: number;
  requirement_structure: RequirementStructure;
  requirements: MajorRequirementsData;
  special_notes: string;
}

export interface MajorRequirementsFile {
  metadata: {
    institution: string;
    program: string;
    last_updated: string;
    version: string;
    total_majors: number;
  };
  requirement_types: Record<string, string>;
  majors: Record<string, MajorRequirement>;
}
