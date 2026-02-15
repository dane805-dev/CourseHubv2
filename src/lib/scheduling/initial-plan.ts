import type { QuarterId } from "@/types/plan";
import type { Placement } from "@/types/plan";
import type { CULoadPreference, WaiverConfig, MajorCode } from "@/types/user";
import { getCreditUnits } from "@/lib/data/course-resolver";
import { getCoreRequirements } from "@/lib/data/requirements";
import { CU_LOAD_DEFAULTS } from "@/lib/data/constants";

/**
 * Known fixed core placements based on Wharton MBA curriculum structure.
 * These courses are assigned to specific quarters in Year 1.
 */
const FIXED_CORE_PLACEMENTS: { courseId: string; quarter: QuarterId; coreCode: string }[] = [
  // Fall Q1 (0.5 CU each)
  { courseId: "MGMT6100", quarter: "Y1F_Q1", coreCode: "MGMT_FOUNDATION" },
  { courseId: "BEPP6110", quarter: "Y1F_Q1", coreCode: "BEPP_MICRO_FOUNDATIONS" },
  { courseId: "MKTG6110", quarter: "Y1F_Q1", coreCode: "MKTG_FIXED" },

  // Fall Q2 (0.5 CU)
  { courseId: "BEPP6120", quarter: "Y1F_Q2", coreCode: "BEPP_MICRO_ADVANCED" },
];

/**
 * Flex core defaults — placed in Year 1 quarters based on typical scheduling.
 * Students can change these after initial generation.
 */
const FLEX_CORE_DEFAULTS: { courseId: string; quarter: QuarterId; coreCode: string }[] = [
  // STAT — Fall (semester-long, 1.0 CU default is STAT6130)
  { courseId: "STAT6130", quarter: "Y1F_Q1", coreCode: "STAT_CORE" },

  // WHCP — typically Fall Q2
  { courseId: "WHCP6160", quarter: "Y1F_Q2", coreCode: "WHCP" },

  // Accounting flex — Spring (1.0 CU, semester-long)
  { courseId: "ACCT6130", quarter: "Y1S_Q3", coreCode: "ACCT_FLEX" },

  // FNCE Corp flex — Spring (1.0 CU)
  { courseId: "FNCE6110", quarter: "Y1S_Q3", coreCode: "FNCE_CORP_FLEX" },

  // FNCE Macro flex — Spring (1.0 CU)
  { courseId: "FNCE6130", quarter: "Y1S_Q4", coreCode: "FNCE_MACRO_FLEX" },

  // LGST flex — Spring Q3 (0.5 CU)
  { courseId: "LGST6110", quarter: "Y1S_Q3", coreCode: "LGST_FLEX" },

  // MGMT flex — Spring (1.0 CU)
  { courseId: "MGMT6110", quarter: "Y1S_Q4", coreCode: "MGMT_FLEX" },

  // MKTG flex — Spring Q4 (0.5 CU)
  { courseId: "MKTG6120", quarter: "Y1S_Q4", coreCode: "MKTG_FLEX" },

  // OIDD flex — two 0.5 CU courses in Year 2
  { courseId: "OIDD6110", quarter: "Y2F_Q5", coreCode: "OIDD_FLEX" },
  { courseId: "OIDD6120", quarter: "Y2F_Q5", coreCode: "OIDD_FLEX" },
];

interface GeneratePlanInput {
  majors: MajorCode[];
  waivers: WaiverConfig[];
  cuLoadPreference: CULoadPreference;
}

/**
 * Generate an initial course plan populated with core courses.
 * Rules-based, not AI-generated.
 */
export function generateInitialPlan(input: GeneratePlanInput): Placement[] {
  const placements: Placement[] = [];
  const waiverMap = new Map(input.waivers.map((w) => [w.coreCode, w]));

  // Check if finance major — need FNCE6110 and FNCE6130 specifically
  const isFinanceMajor = input.majors.includes("FNCE") || input.majors.includes("QFNC");

  // 1. Place fixed cores (skip waived/substituted ones)
  for (const fixed of FIXED_CORE_PLACEMENTS) {
    const waiver = waiverMap.get(fixed.coreCode);
    if (waiver && (waiver.waiverType === "waiver" || waiver.waiverType === "substitution")) continue;
    addPlacement(placements, fixed.courseId, fixed.quarter);
  }

  // 2. Place flex cores (skip waived/substituted ones, handle placements)
  for (const flex of FLEX_CORE_DEFAULTS) {
    const waiver = waiverMap.get(flex.coreCode);

    // Skip waived or substituted cores
    if (waiver && (waiver.waiverType === "waiver" || waiver.waiverType === "substitution")) continue;

    // Handle STAT placement: use STAT6210 instead of STAT6130
    if (waiver?.waiverType === "placement" && flex.coreCode === "STAT_CORE") {
      addPlacement(placements, "STAT6210", flex.quarter);
      continue;
    }

    // Finance major overrides
    if (isFinanceMajor) {
      if (flex.coreCode === "FNCE_CORP_FLEX" && flex.courseId !== "FNCE6110") continue;
      if (flex.coreCode === "FNCE_MACRO_FLEX" && flex.courseId !== "FNCE6130") continue;
    }

    addPlacement(placements, flex.courseId, flex.quarter);
  }

  return placements;
}

function addPlacement(
  placements: Placement[],
  courseId: string,
  quarter: QuarterId
): void {
  // Don't add duplicates
  if (placements.some((p) => p.courseId === courseId)) return;

  const cu = getCreditUnits(courseId) ?? 0.5;
  const existingInQuarter = placements.filter((p) => p.location === quarter);

  placements.push({
    courseId,
    location: quarter,
    sortOrder: existingInQuarter.length,
    creditUnits: cu,
  });
}
