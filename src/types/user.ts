export type MajorCode =
  | "ACCT"
  | "AIFB"
  | "BUAN"
  | "BEPP"
  | "BEES"
  | "ENTR"
  | "ESGB"
  | "FNCE"
  | "HCMG"
  | "LEAD"
  | "MGMT"
  | "MKTG"
  | "MKOP"
  | "MNMG"
  | "OIDD"
  | "OREF"
  | "QFNC"
  | "REAL"
  | "SOGO"
  | "STAT"
  | "STRA";

export type WaiverType = "waiver" | "substitution" | "placement";

export type CULoadPreference = "light" | "normal" | "heavy";

export interface WaiverConfig {
  coreCode: string;
  waiverType: WaiverType;
  substitutionCourseId?: string;
  cuImpact: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  onboardingCompleted: boolean;
  cuLoadPreference: CULoadPreference;
  majors: MajorCode[];
  waivers: WaiverConfig[];
}

/** All 21 majors with their display names */
export const MAJOR_OPTIONS: { code: MajorCode; name: string }[] = [
  { code: "ACCT", name: "Accounting" },
  { code: "AIFB", name: "Artificial Intelligence for Business" },
  { code: "BUAN", name: "Business Analytics" },
  { code: "BEPP", name: "Business Economics and Public Policy" },
  { code: "BEES", name: "Business, Energy, Environment and Sustainability" },
  { code: "ENTR", name: "Entrepreneurship and Innovation" },
  { code: "ESGB", name: "Environmental, Social and Governance Factors for Business" },
  { code: "FNCE", name: "Finance" },
  { code: "HCMG", name: "Health Care Management" },
  { code: "LEAD", name: "Leading Across Differences" },
  { code: "MGMT", name: "Management" },
  { code: "MKTG", name: "Marketing Management" },
  { code: "MKOP", name: "Marketing and Operations Management" },
  { code: "MNMG", name: "Multinational Management" },
  { code: "OIDD", name: "Operations, Information and Decisions" },
  { code: "OREF", name: "Organizational Effectiveness" },
  { code: "QFNC", name: "Quantitative Finance" },
  { code: "REAL", name: "Real Estate" },
  { code: "SOGO", name: "Social and Governance Factors for Business" },
  { code: "STAT", name: "Statistics" },
  { code: "STRA", name: "Strategic Management" },
];

/**
 * Mutual major exclusions — if you declare one, you cannot declare the other.
 * Each entry is a pair of mutually exclusive major codes.
 */
export const MAJOR_EXCLUSIONS: [MajorCode, MajorCode][] = [
  ["FNCE", "QFNC"],
  ["ESGB", "BEES"],
  ["ESGB", "SOGO"],
];

/**
 * MKOP cannot be declared with MKTG or OIDD.
 * Separate because it's one-to-many rather than a simple pair.
 */
export const MKOP_EXCLUSIONS: MajorCode[] = ["MKTG", "OIDD"];

